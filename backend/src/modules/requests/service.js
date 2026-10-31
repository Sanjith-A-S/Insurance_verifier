import { EvidenceRequest } from '../../models/evidenceRequest.model.js';
import { Claim } from '../../models/claim.model.js';
import { ClaimMessage } from '../../models/claimMessage.model.js';
import { EvidenceFile } from '../../models/evidenceFile.model.js';
import {
  loadClaimForActor,
  assertRole,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../lib/errors.js';

export async function listRequests(actor, claimId) {
  await loadClaimForActor(claimId, actor);

  const filter = { claimId };
  if (actor.role === 'claimant') {
    filter.status = { $in: ['sent', 'response_submitted', 'resolved'] };
  }

  const list = await EvidenceRequest.find(filter).sort({ createdAt: -1 }).lean();
  return list.map((r) => ({
    id: r._id.toString(),
    claimId: r.claimId,
    title: r.title,
    reason: r.reason,
    examples: r.examples || [],
    checklistItemId: r.checklistItemId,
    findingId: r.findingId,
    status: r.status,
    dueDate: r.dueDate,
    createdBy: r.createdBy,
    sentAt: r.sentAt,
    resolvedAt: r.resolvedAt,
    notApplicableReason: r.notApplicableReason,
    responses: r.responses || [],
    createdAt: r.createdAt,
  }));
}

export async function getRequest(actor, claimId, requestId) {
  await loadClaimForActor(claimId, actor);
  const reqDoc = await EvidenceRequest.findOne({ _id: requestId, claimId }).lean();

  if (!reqDoc) {
    throw new NotFoundError('Evidence request not found');
  }

  if (actor.role === 'claimant' && !['sent', 'response_submitted', 'resolved'].includes(reqDoc.status)) {
    throw new NotFoundError('Evidence request not found');
  }

  return {
    id: reqDoc._id.toString(),
    claimId: reqDoc.claimId,
    title: reqDoc.title,
    reason: reqDoc.reason,
    examples: reqDoc.examples || [],
    checklistItemId: reqDoc.checklistItemId,
    findingId: reqDoc.findingId,
    status: reqDoc.status,
    dueDate: reqDoc.dueDate,
    createdBy: reqDoc.createdBy,
    sentAt: reqDoc.sentAt,
    resolvedAt: reqDoc.resolvedAt,
    notApplicableReason: reqDoc.notApplicableReason,
    responses: reqDoc.responses || [],
    createdAt: reqDoc.createdAt,
  };
}

export async function createRequest(actor, claimId, body) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  if (!body.title || !body.reason) {
    throw new ValidationError('Title and reason are required to create an evidence request', [
      { field: 'title', message: 'Title is required' },
      { field: 'reason', message: 'Reason is required' },
    ]);
  }

  const initialStatus = body.status === 'sent' ? 'sent' : 'draft';
  const sentAt = initialStatus === 'sent' ? new Date() : null;

  const reqDoc = await EvidenceRequest.create({
    claimId,
    title: body.title.trim(),
    reason: body.reason.trim(),
    examples: body.examples || [],
    checklistItemId: body.checklistItemId || null,
    findingId: body.findingId || null,
    status: initialStatus,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    createdBy: { id: actor.id, name: actor.name },
    sentAt,
    history: [
      {
        status: initialStatus,
        by: { id: actor.id, name: actor.name },
        at: new Date(),
      },
    ],
  });

  // Apply side effects of sending
  if (initialStatus === 'sent') {
    await applySendSideEffects(claim, reqDoc, actor);
  }

  return getRequest(actor, claimId, reqDoc._id);
}

export async function patchRequest(actor, claimId, requestId, body) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  const reqDoc = await EvidenceRequest.findOne({ _id: requestId, claimId });
  if (!reqDoc) {
    throw new NotFoundError('Evidence request not found');
  }

  const action = body.action || 'update';

  if (action === 'send') {
    if (reqDoc.status !== 'draft') {
      throw new ConflictError("Only draft requests can be changed to 'sent'");
    }
    reqDoc.status = 'sent';
    reqDoc.sentAt = new Date();
    reqDoc.history.push({
      status: 'sent',
      by: { id: actor.id, name: actor.name },
      at: new Date(),
    });
    await reqDoc.save();
    await applySendSideEffects(claim, reqDoc, actor);
  } else if (action === 'resolve') {
    if (reqDoc.status !== 'response_submitted') {
      throw new ConflictError("Requests can only be resolved once a claimant response has been submitted");
    }
    reqDoc.status = 'resolved';
    reqDoc.resolvedAt = new Date();
    reqDoc.history.push({
      status: 'resolved',
      by: { id: actor.id, name: actor.name },
      at: new Date(),
    });
    await reqDoc.save();
    await checkLastOpenRequestAndRevertStatus(claim, actor);
  } else if (action === 'mark_not_applicable') {
    if (!body.reason || !body.reason.trim()) {
      throw new ValidationError('A reason is required to mark an evidence request as not applicable', [
        { field: 'reason', message: 'Reason is required' },
      ]);
    }
    reqDoc.status = 'not_applicable';
    reqDoc.notApplicableReason = body.reason.trim();
    reqDoc.history.push({
      status: 'not_applicable',
      by: { id: actor.id, name: actor.name },
      at: new Date(),
    });
    await reqDoc.save();
    await checkLastOpenRequestAndRevertStatus(claim, actor);
  } else if (action === 'update') {
    if (!['draft', 'sent'].includes(reqDoc.status)) {
      throw new ConflictError('Cannot update request content after it is resolved or marked not applicable');
    }
    if (body.title) reqDoc.title = body.title.trim();
    if (body.reason) reqDoc.reason = body.reason.trim();
    if (body.examples) reqDoc.examples = body.examples;
    if (body.dueDate) reqDoc.dueDate = new Date(body.dueDate);
    await reqDoc.save();
  } else {
    throw new ValidationError(`Unknown request action '${action}'`);
  }

  return getRequest(actor, claimId, reqDoc._id);
}

export async function submitClaimantResponse(actor, claimId, requestId, body) {
  assertRole(actor, 'claimant');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);

  const reqDoc = await EvidenceRequest.findOne({ _id: requestId, claimId });
  if (!reqDoc || !['sent', 'response_submitted'].includes(reqDoc.status)) {
    throw new NotFoundError('Evidence request not found or not currently awaiting response');
  }

  const hasMessage = Boolean(body.message && body.message.trim());
  const hasEvidence = Array.isArray(body.evidenceIds) && body.evidenceIds.length > 0;
  const isUnavailable = Boolean(body.unavailable);

  if (!hasMessage && !hasEvidence && !isUnavailable) {
    throw new ValidationError(
      'Response requires at least one of: message, uploaded evidence files, or unavailable indication',
      [{ field: 'response', message: 'Provide a message, files, or mark unavailable with reason' }]
    );
  }

  if (isUnavailable && (!body.reason || !body.reason.trim())) {
    throw new ValidationError('A reason must be provided when marking requested evidence as unavailable', [
      { field: 'reason', message: 'Reason is required' },
    ]);
  }

  // Verify evidence files belong to claim
  if (hasEvidence) {
    const count = await EvidenceFile.countDocuments({
      claimId,
      _id: { $in: body.evidenceIds },
    });
    if (count !== body.evidenceIds.length) {
      throw new ValidationError('One or more evidence IDs do not belong to this claim');
    }
  }

  const responseItem = {
    id: `resp_${Date.now()}`,
    by: { id: actor.id, name: actor.name },
    at: new Date(),
    message: hasMessage ? body.message.trim() : null,
    evidenceIds: hasEvidence ? body.evidenceIds : [],
    unavailable: isUnavailable,
    reason: isUnavailable ? body.reason.trim() : null,
  };

  reqDoc.responses.push(responseItem);
  reqDoc.status = 'response_submitted';
  reqDoc.history.push({
    status: 'response_submitted',
    by: { id: actor.id, name: actor.name },
    at: new Date(),
  });
  await reqDoc.save();

  // Update linked checklist item
  if (reqDoc.checklistItemId) {
    const item = claim.checklist.find((i) => i.id === reqDoc.checklistItemId);
    if (item) {
      if (isUnavailable) {
        item.status = 'unavailable';
        item.unavailableReason = body.reason.trim();
      } else if (hasEvidence) {
        item.status = 'received';
        if (!item.evidenceIds) item.evidenceIds = [];
        for (const eid of body.evidenceIds) {
          if (!item.evidenceIds.includes(eid)) item.evidenceIds.push(eid);
        }
      }
      item.statusChangedBy = actor.id;
      item.statusChangedAt = new Date();
      await claim.save();
    }
  }

  await logTimelineEvent({
    claimId,
    kind: 'evidence_response_submitted',
    summary: `${actor.name} submitted a response to evidence request '${reqDoc.title}'`,
    actor,
    visibility: 'verifier',
    metadata: { requestId: reqDoc._id.toString() },
  });

  return getRequest(actor, claimId, reqDoc._id);
}

async function applySendSideEffects(claim, reqDoc, actor) {
  // 1. Move claim to awaiting_claimant
  const prevStatus = claim.status;
  claim.status = 'awaiting_claimant';

  // 2. Update linked checklist item to requested
  if (reqDoc.checklistItemId) {
    const item = claim.checklist.find((i) => i.id === reqDoc.checklistItemId);
    if (item) {
      item.status = 'requested';
      item.statusChangedBy = actor.id;
      item.statusChangedAt = new Date();
    }
  }
  await claim.save();

  // 3. Create request_notice message in thread
  await ClaimMessage.create({
    claimId: claim._id,
    sender: { id: actor.id, name: actor.name, role: actor.role },
    body: `Evidence Requested: ${reqDoc.title}\n\nReason: ${reqDoc.reason}`,
    kind: 'request_notice',
    requestId: reqDoc._id.toString(),
    readBy: [actor.id],
  });

  // 4. Log claimant-visible neutral timeline event
  await logTimelineEvent({
    claimId: claim._id,
    kind: 'evidence_requested',
    summary: `Additional evidence requested: ${reqDoc.title}`,
    actor,
    visibility: 'claimant',
    metadata: { requestId: reqDoc._id.toString(), from: prevStatus, to: 'awaiting_claimant' },
  });
}

async function checkLastOpenRequestAndRevertStatus(claim, actor) {
  const openCount = await EvidenceRequest.countDocuments({
    claimId: claim._id,
    status: { $in: ['sent', 'response_submitted'] },
  });

  if (openCount === 0 && claim.status === 'awaiting_claimant') {
    claim.status = 'in_review';
    await claim.save();

    await logTimelineEvent({
      claimId: claim._id,
      kind: 'status_changed',
      summary: 'Your claim is now being reviewed',
      actor,
      visibility: 'claimant',
      metadata: { from: 'awaiting_claimant', to: 'in_review' },
    });
  }
}
