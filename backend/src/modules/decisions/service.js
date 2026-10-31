import { Decision } from '../../models/decision.model.js';
import { Claim } from '../../models/claim.model.js';
import {
  loadClaimForActor,
  assertRole,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import { ValidationError, ConflictError } from '../../lib/errors.js';

export async function listDecisions(actor, claimId) {
  assertRole(actor, 'verifier'); // Claimants never receive decisions
  await loadClaimForActor(claimId, actor);

  const decisions = await Decision.find({ claimId }).sort({ at: -1 }).lean();
  return decisions.map((d) => ({
    id: d._id.toString(),
    claimId: d.claimId,
    decision: d.decision,
    rationale: d.rationale,
    recommendedAmount: d.recommendedAmount,
    actor: d.actor,
    at: d.at,
  }));
}

export async function recordDecision(actor, claimId, { decision, rationale = '', recommendedAmount = null }) {
  assertRole(actor, 'verifier'); // Claimants never receive decisions
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  const allowedDecisions = [
    'pending',
    'recommend_approve',
    'recommend_partial',
    'recommend_reject',
    'more_information_required',
    'closed',
  ];

  if (!allowedDecisions.includes(decision)) {
    throw new ValidationError(`Invalid decision '${decision}'. Allowed: ${allowedDecisions.join(', ')}`, [
      { field: 'decision', message: 'Invalid decision option' },
    ]);
  }

  if (decision !== 'pending' && (!rationale || rationale.trim().length === 0)) {
    throw new ValidationError('A rationale is required for any non-pending decision', [
      { field: 'rationale', message: 'Rationale is required' },
    ]);
  }

  if (recommendedAmount !== null && (typeof recommendedAmount !== 'number' || recommendedAmount < 0)) {
    throw new ValidationError('Recommended amount must be a number greater than or equal to 0', [
      { field: 'recommendedAmount', message: 'Amount must be >= 0' },
    ]);
  }

  const decisionDoc = await Decision.create({
    claimId,
    decision,
    rationale: rationale.trim(),
    recommendedAmount,
    actor: { id: actor.id, name: actor.name },
    at: new Date(),
  });

  // Apply claim status side effects
  const prevStatus = claim.status;

  if (['recommend_approve', 'recommend_partial', 'recommend_reject'].includes(decision)) {
    claim.status = 'decision_pending';
    await claim.save();
  } else if (decision === 'more_information_required') {
    claim.status = 'in_review';
    await claim.save();

    await logTimelineEvent({
      claimId,
      kind: 'review_information_required',
      summary: 'Your claim review requires additional information',
      actor,
      visibility: 'claimant', // Neutral wording
      metadata: { from: prevStatus, to: 'in_review' },
    });
  } else if (decision === 'closed') {
    claim.status = 'completed';
    await claim.save();

    await logTimelineEvent({
      claimId,
      kind: 'claim_closed',
      summary: 'Your claim investigation has been closed',
      actor,
      visibility: 'claimant', // Neutral wording
      metadata: { from: prevStatus, to: 'completed' },
    });
  }

  await logTimelineEvent({
    claimId,
    kind: 'decision_recorded',
    summary: `Decision '${decision}' recorded by ${actor.name}`,
    actor,
    visibility: 'verifier',
    metadata: { decision, recommendedAmount, decisionId: decisionDoc._id.toString() },
  });

  return {
    id: decisionDoc._id.toString(),
    claimId: decisionDoc.claimId,
    decision: decisionDoc.decision,
    rationale: decisionDoc.rationale,
    recommendedAmount: decisionDoc.recommendedAmount,
    actor: decisionDoc.actor,
    at: decisionDoc.at,
  };
}
