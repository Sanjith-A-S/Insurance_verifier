import { Claim } from '../../models/claim.model.js';
import { User } from '../../models/user.model.js';
import { TimelineEvent } from '../../models/timelineEvent.model.js';
import { EvidenceRequest } from '../../models/evidenceRequest.model.js';
import { assertRole } from '../../lib/access.js';
import { computeChecklistProgress } from '../../rules/checklist.rules.js';
import { serializeClaimSummary } from '../claims/serializers.js';

export async function getDashboardData(actor) {
  assertRole(actor, 'verifier');

  // Authorized non-draft claims for this verifier
  const filter = {
    status: { $ne: 'draft' },
    $or: [
      { assigneeId: actor.id },
      { assigneeId: null },
      { assigneeId: { $exists: false } },
    ],
  };

  const claims = await Claim.find(filter).lean();

  const totals = {
    total: claims.length,
    new: 0,
    in_review: 0,
    awaiting_claimant: 0,
    decision_pending: 0,
    completed: 0,
  };

  const completenessBands = {
    complete: 0, // 100%
    partial: 0, // 50-99%
    mostlyMissing: 0, // < 50%
  };

  const dateCounts = {};

  for (const c of claims) {
    if (totals[c.status] !== undefined) {
      totals[c.status]++;
    }

    // overTime by createdAt date
    const dStr = c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : 'unknown';
    dateCounts[dStr] = (dateCounts[dStr] || 0) + 1;

    // completeness band
    const { checklistProgress } = computeChecklistProgress(c.checklist);
    const ratio =
      checklistProgress.applicable > 0
        ? (checklistProgress.done / checklistProgress.applicable) * 100
        : 100;

    if (ratio >= 100) {
      completenessBands.complete++;
    } else if (ratio >= 50) {
      completenessBands.partial++;
    } else {
      completenessBands.mostlyMissing++;
    }
  }

  const overTime = Object.entries(dateCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Claims with open 'sent' requests
  const authorizedClaimIds = claims.map((c) => c._id);
  const openSentRequests = await EvidenceRequest.find({
    claimId: { $in: authorizedClaimIds },
    status: 'sent',
  }).distinct('claimId');

  const awaitingEvidenceCount = openSentRequests.length;

  // Recent 10 timeline events across authorized claims (verifier visible)
  const recentEvents = await TimelineEvent.find({
    claimId: { $in: authorizedClaimIds },
    visibility: { $in: ['verifier', 'claimant'] },
  })
    .sort({ at: -1 })
    .limit(10)
    .lean();

  const recentActivity = recentEvents.map((e) => ({
    id: e._id.toString(),
    claimId: e.claimId,
    kind: e.kind,
    summary: e.summary,
    actor: e.actor,
    at: e.at,
  }));

  // Next up: oldest 5 'new' claims as ClaimSummary
  const oldestNewClaims = claims
    .filter((c) => c.status === 'new')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5);

  const claimantIds = [...new Set(oldestNewClaims.map((c) => c.claimantId))];
  const claimants = await User.find({ _id: { $in: claimantIds } }, '_id name').lean();
  const claimantMap = Object.fromEntries(claimants.map((u) => [u._id, u]));

  const nextUp = oldestNewClaims.map((c) =>
    serializeClaimSummary(c, 'verifier', { claimantMap })
  );

  return {
    totals,
    overTime,
    completenessBands,
    awaitingEvidenceCount,
    recentActivity,
    nextUp,
  };
}
