import { SettlementCalculation, SettlementOverride } from '../../models/settlement.model.js';
import { Claim } from '../../models/claim.model.js';
import { ExtractedFact } from '../../models/extractedFact.model.js';
import { Analysis } from '../../models/analysis.model.js';
import { FindingReview } from '../../models/findingReview.model.js';
import {
  loadClaimForActor,
  assertRole,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { calculateSettlement } from '../../rules/settlement.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import { ValidationError, NotFoundError } from '../../lib/errors.js';

export async function recalculateSettlement(actor, claimId) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  const latestVersion = claim.latestAnalysisVersion || 1;
  const analysis = await Analysis.findOne({ claimId, version: latestVersion });

  const [facts, reviews, overrides] = await Promise.all([
    ExtractedFact.find({ claimId, analysisVersion: latestVersion }).lean(),
    FindingReview.find({ claimId, analysisVersion: latestVersion }).lean(),
    SettlementOverride.find({ claimId }).sort({ at: -1 }).lean(),
  ]);

  const findings = analysis ? analysis.findings : [];

  const settlement = calculateSettlement({
    extractedFacts: facts,
    findings,
    findingReviews: reviews,
    overrides,
    calculatedBy: { id: actor.id, name: actor.name },
  });

  // Persist calculation record
  await SettlementCalculation.create({
    claimId,
    analysisVersion: latestVersion,
    status: settlement.status,
    currency: settlement.currency,
    lines: settlement.lines,
    formula: settlement.formula,
    assumptions: settlement.assumptions,
    unresolved: settlement.unresolved,
    resultAmount: settlement.resultAmount,
    calculatedBy: { id: actor.id, name: actor.name },
  });

  // Update latest analysis snapshot if exists
  if (analysis) {
    analysis.settlement = settlement;
    await analysis.save();
  }

  await logTimelineEvent({
    claimId,
    kind: 'settlement_recalculated',
    summary:
      settlement.status === 'calculated'
        ? `Settlement calculated at ₹${settlement.resultAmount?.toLocaleString('en-IN')}`
        : 'Settlement calculation withheld pending unresolved blockers',
    actor,
    visibility: 'verifier',
    metadata: { status: settlement.status, resultAmount: settlement.resultAmount },
  });

  return settlement;
}

export async function createSettlementOverride(actor, claimId, { amount, rationale }) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  if (typeof amount !== 'number' || amount < 0) {
    throw new ValidationError('Override amount must be a number greater than or equal to 0', [
      { field: 'amount', message: 'Amount must be >= 0' },
    ]);
  }

  if (!rationale || typeof rationale !== 'string' || rationale.trim().length < 10) {
    throw new ValidationError('A detailed rationale of at least 10 characters is required for an override', [
      { field: 'rationale', message: 'Rationale must be at least 10 characters' },
    ]);
  }

  await SettlementOverride.create({
    claimId,
    amount,
    rationale: rationale.trim(),
    by: { id: actor.id, name: actor.name },
    at: new Date(),
  });

  await logTimelineEvent({
    claimId,
    kind: 'settlement_override_recorded',
    summary: `Settlement override note recorded (₹${amount.toLocaleString('en-IN')})`,
    actor,
    visibility: 'verifier',
    metadata: { amount, rationale: rationale.trim() },
  });

  // Return recalculated settlement reflecting new override in overrides[] list
  return recalculateSettlement(actor, claimId);
}

