import { Claim } from '../../models/claim.model.js';
import { User } from '../../models/user.model.js';
import { EvidenceFile } from '../../models/evidenceFile.model.js';
import { EvidenceRequest } from '../../models/evidenceRequest.model.js';
import { ClaimMessage } from '../../models/claimMessage.model.js';
import { FindingReview } from '../../models/findingReview.model.js';
import { Analysis } from '../../models/analysis.model.js';
import {
  loadClaimForActor,
  assertRole,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { generateClaimId } from '../../lib/ids.js';
import { getPagination, formatPaginationMeta } from '../../lib/pagination.js';
import { generateChecklist } from '../../rules/checklist.rules.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import { serializeClaimSummary, serializeClaimDetail } from './serializers.js';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../lib/errors.js';

export async function listClaims(actor, query = {}) {
  const { page, pageSize, skip, limit } = getPagination(query);
  const filter = {};

  if (actor.role === 'claimant') {
    filter.claimantId = actor.id;
  } else if (actor.role === 'verifier') {
    filter.status = { $ne: 'draft' };

    if (query.assignee === 'me') {
      filter.assigneeId = actor.id;
    } else {
      filter.$or = [
        { assigneeId: actor.id },
        { assigneeId: null },
        { assigneeId: { $exists: false } },
      ];
    }
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  // Handle search
  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    const searchRegex = new RegExp(s, 'i');

    const searchOr = [
      { _id: searchRegex },
      { 'vehicle.registrationNumber': searchRegex },
      { 'vehicle.make': searchRegex },
      { 'vehicle.model': searchRegex },
    ];

    if (actor.role === 'verifier') {
      const matchingClaimants = await User.find({ name: searchRegex }, '_id').lean();
      const claimantIds = matchingClaimants.map((u) => u._id);
      if (claimantIds.length > 0) {
        searchOr.push({ claimantId: { $in: claimantIds } });
      }
    }

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  const sort = query.sort === 'oldest' ? { createdAt: 1 } : { updatedAt: -1 };

  const [claims, total] = await Promise.all([
    Claim.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Claim.countDocuments(filter),
  ]);

  // Bulk lookup claimants and assignees
  const claimantIds = [...new Set(claims.map((c) => c.claimantId))];
  const assigneeIds = [...new Set(claims.map((c) => c.assigneeId).filter(Boolean))];

  const [claimantUsers, assigneeUsers] = await Promise.all([
    User.find({ _id: { $in: claimantIds } }, '_id name').lean(),
    User.find({ _id: { $in: assigneeIds } }, '_id name').lean(),
  ]);

  const claimantMap = Object.fromEntries(claimantUsers.map((u) => [u._id, u]));
  const assigneeMap = Object.fromEntries(assigneeUsers.map((u) => [u._id, u]));

  // Unread message counts
  const claimIds = claims.map((c) => c._id);
  const unreadMessages = await ClaimMessage.find({
    claimId: { $in: claimIds },
    'sender.id': { $ne: actor.id },
    readBy: { $ne: actor.id },
  }).lean();

  const unreadCounts = {};
  for (const msg of unreadMessages) {
    unreadCounts[msg.claimId] = (unreadCounts[msg.claimId] || 0) + 1;
  }

  const data = claims.map((claim) =>
    serializeClaimSummary(claim, actor.role, {
      claimantMap,
      assigneeMap,
      unreadCounts,
    })
  );

  return {
    data,
    meta: formatPaginationMeta(page, pageSize, total),
  };
}

export async function createDraftClaim(actor, body, idempotencyKey) {
  assertRole(actor, 'claimant');

  if (idempotencyKey) {
    const existing = await Claim.findOne({
      claimantId: actor.id,
      idempotencyKey,
    });
    if (existing) {
      return serializeClaimDetail(existing, actor.role);
    }
  }

  const claimId = await generateClaimId();
  const initialChecklist = generateChecklist(body);

  const claim = await Claim.create({
    _id: claimId,
    claimantId: actor.id,
    status: 'draft',
    priority: 'medium',
    incident: body.incident,
    vehicle: body.vehicle,
    driver: body.driver,
    narrative: body.narrative || '',
    policy: body.policy || {},
    idempotencyKey: idempotencyKey || null,
    checklist: initialChecklist,
  });

  await logTimelineEvent({
    claimId: claim._id,
    kind: 'claim_draft_created',
    summary: 'Claim draft initialized',
    actor,
    visibility: 'claimant',
  });

  return serializeClaimDetail(claim, actor.role);
}

export async function getClaim(actor, claimId) {
  const claim = await loadClaimForActor(claimId, actor);

  const [claimantUser, assigneeUser, openRequests, unreadCount, latestAnalysis] =
    await Promise.all([
      User.findById(claim.claimantId, '_id name').lean(),
      claim.assigneeId ? User.findById(claim.assigneeId, '_id name').lean() : null,
      EvidenceRequest.countDocuments({
        claimId,
        status: { $in: ['sent', 'response_submitted'] },
      }),
      ClaimMessage.countDocuments({
        claimId,
        'sender.id': { $ne: actor.id },
        readBy: { $ne: actor.id },
      }),
      claim.latestAnalysisVersion
        ? Analysis.findOne({ claimId, version: claim.latestAnalysisVersion }).lean()
        : null,
    ]);

  let openFindingsCount = 0;
  if (latestAnalysis && Array.isArray(latestAnalysis.findings)) {
    const reviews = await FindingReview.find({
      claimId,
      analysisVersion: claim.latestAnalysisVersion,
    }).lean();
    const reviewStatusMap = new Map(reviews.map((r) => [r.findingId, r.status]));

    openFindingsCount = latestAnalysis.findings.filter(
      (f) => !reviewStatusMap.has(f.id) || reviewStatusMap.get(f.id) === 'open'
    ).length;
  }

  const claimantMap = claimantUser ? { [claimantUser._id]: claimantUser } : {};
  const assigneeMap = assigneeUser ? { [assigneeUser._id]: assigneeUser } : {};
  const unreadCounts = { [claim._id]: unreadCount };

  return serializeClaimDetail(claim, actor.role, {
    claimantMap,
    assigneeMap,
    unreadCounts,
    openRequestsCount: openRequests,
    openFindingsCount,
  });
}

export async function updateDraftClaim(actor, claimId, updates) {
  assertRole(actor, 'claimant');
  const claim = await loadClaimForActor(claimId, actor);

  if (claim.status !== 'draft') {
    throw new ConflictError('Cannot update claim details after submission');
  }

  if (updates.incident) {
    claim.incident = { ...claim.incident.toObject(), ...updates.incident };
  }
  if (updates.vehicle) {
    claim.vehicle = { ...claim.vehicle.toObject(), ...updates.vehicle };
  }
  if (updates.driver) {
    claim.driver = { ...claim.driver.toObject(), ...updates.driver };
  }
  if (updates.narrative !== undefined) {
    claim.narrative = updates.narrative;
  }
  if (updates.policy) {
    claim.policy = { ...claim.policy.toObject(), ...updates.policy };
  }

  claim.checklist = generateChecklist(claim, claim.checklist);
  await claim.save();

  return serializeClaimDetail(claim, actor.role);
}

export async function submitClaim(actor, claimId) {
  assertRole(actor, 'claimant');
  const claim = await loadClaimForActor(claimId, actor);

  // Idempotent: already submitted returns 200 unchanged
  if (claim.status !== 'draft') {
    return serializeClaimDetail(claim, actor.role);
  }

  // Preconditions: needs >= 1 photo and >= 1 document
  const files = await EvidenceFile.find({ claimId }).lean();
  const hasPhoto = files.some((f) =>
    f.mimeType.startsWith('image/') || f.category === 'photos_video'
  );
  const hasDocument = files.some(
    (f) =>
      f.mimeType === 'application/pdf' ||
      ['policy', 'vehicle_identity', 'driver', 'repair_loss'].includes(f.category)
  );

  const errors = [];
  if (!hasPhoto) {
    errors.push({
      field: 'evidence.photos',
      message: 'Claim submission requires at least one photograph of the vehicle or damage',
    });
  }
  if (!hasDocument) {
    errors.push({
      field: 'evidence.documents',
      message: 'Claim submission requires at least one supporting document (policy, RC, or licence)',
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Submission requirements not met', errors);
  }

  claim.status = 'new';
  claim.submittedAt = new Date();
  await claim.save();

  await logTimelineEvent({
    claimId: claim._id,
    kind: 'claim_submitted',
    summary: 'Claim submitted successfully for review',
    actor,
    visibility: 'claimant',
  });

  return serializeClaimDetail(claim, actor.role);
}

export async function assignClaim(actor, claimId, assigneeIdInput) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);

  const targetId = assigneeIdInput === 'me' ? actor.id : assigneeIdInput;
  const targetUser = await User.findById(targetId);
  if (!targetUser || targetUser.role !== 'verifier') {
    throw new ValidationError('Invalid assignee: user must be an active verifier', [
      { field: 'assigneeId', message: 'Target user must be a verifier' },
    ]);
  }

  claim.assigneeId = targetId;
  const prevStatus = claim.status;
  if (claim.status === 'new') {
    claim.status = 'in_review';
  }

  await claim.save();

  await logTimelineEvent({
    claimId: claim._id,
    kind: 'assignment_updated',
    summary: `Claim assigned to ${targetUser.name}`,
    actor,
    visibility: 'verifier',
  });

  if (prevStatus === 'new') {
    await logTimelineEvent({
      claimId: claim._id,
      kind: 'status_changed',
      summary: 'Your claim is now being reviewed',
      actor,
      visibility: 'claimant',
      metadata: { from: 'new', to: 'in_review' },
    });
  }

  return serializeClaimDetail(claim, actor.role);
}

export async function updateClaimStatus(actor, claimId, targetStatus) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  // Allowed manual targets: in_review, decision_pending
  if (!['in_review', 'decision_pending'].includes(targetStatus)) {
    throw new ConflictError(
      `Invalid manual status transition to '${targetStatus}'. Only 'in_review' and 'decision_pending' can be set manually.`
    );
  }

  const prev = claim.status;
  claim.status = targetStatus;
  await claim.save();

  await logTimelineEvent({
    claimId: claim._id,
    kind: 'status_changed',
    summary:
      targetStatus === 'decision_pending'
        ? 'Claim investigation under final decision review'
        : 'Your claim is now being reviewed',
    actor,
    visibility: 'claimant',
    metadata: { from: prev, to: targetStatus },
  });

  return serializeClaimDetail(claim, actor.role);
}

export async function getChecklist(actor, claimId) {
  const claim = await loadClaimForActor(claimId, actor);
  return claim.checklist || [];
}

export async function updateChecklistItem(actor, claimId, itemId, { status, reason }) {
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);

  const item = claim.checklist.find((i) => i.id === itemId);
  if (!item) {
    throw new NotFoundError(`Checklist item '${itemId}' not found on claim`);
  }

  if (actor.role === 'claimant') {
    if (status !== 'unavailable') {
      throw new ForbiddenError("Claimant can only update checklist status to 'unavailable'");
    }
    if (!reason || !reason.trim()) {
      throw new ValidationError('A reason is required when marking an item as unavailable', [
        { field: 'reason', message: 'Reason is required' },
      ]);
    }
    item.status = 'unavailable';
    item.unavailableReason = reason.trim();
  } else {
    // Verifier can set any valid status
    item.status = status;
    if (reason) item.reason = reason;
  }

  item.statusChangedBy = actor.id;
  item.statusChangedAt = new Date();
  await claim.save();

  await logTimelineEvent({
    claimId: claim._id,
    kind: 'checklist_updated',
    summary: `Checklist item '${item.label}' updated to ${status}`,
    actor,
    visibility: 'verifier',
    metadata: { itemId, status, reason },
  });

  return item;
}
