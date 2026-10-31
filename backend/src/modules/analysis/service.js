import { Analysis } from '../../models/analysis.model.js';
import { FindingReview } from '../../models/findingReview.model.js';
import { MatrixAnnotation } from '../../models/matrixAnnotation.model.js';
import { Claim } from '../../models/claim.model.js';
import {
  loadClaimForActor,
  assertRole,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { initiateAnalysis } from '../../ai/pipeline.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import {
  NotFoundError,
  ValidationError,
  AnalysisUnavailableError,
} from '../../lib/errors.js';

export async function startAnalysis(actor, claimId) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  return initiateAnalysis(claimId, actor);
}

export async function getAnalysisStatus(actor, claimId) {
  assertRole(actor, 'verifier');
  await loadClaimForActor(claimId, actor);

  const running = await Analysis.findOne({ claimId, state: 'running' }).sort({ version: -1 }).lean();
  if (running) {
    return {
      state: 'running',
      version: running.version,
    };
  }

  const latestReady = await Analysis.findOne({ claimId, state: 'ready' }).sort({ version: -1 }).lean();
  if (latestReady) {
    return {
      state: 'ready',
      version: latestReady.version,
    };
  }

  const unavailable = await Analysis.findOne({ claimId, state: 'unavailable' }).sort({ version: -1 }).lean();
  if (unavailable) {
    return {
      state: 'unavailable',
    };
  }

  return {
    state: 'unavailable',
  };
}

export async function getAnalysisVersions(actor, claimId) {
  assertRole(actor, 'verifier');
  await loadClaimForActor(claimId, actor);

  const analyses = await Analysis.find({ claimId }).sort({ version: -1 }).lean();
  return analyses.map((a) => ({
    version: a.version,
    createdAt: a.createdAt,
    state: a.state,
  }));
}

export async function getAnalysisDetail(actor, claimId, requestedVersion) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);

  let query = { claimId };
  if (requestedVersion) {
    query.version = parseInt(requestedVersion, 10);
  } else {
    // Latest ready version if omitted
    query.state = 'ready';
  }

  const analysis = await Analysis.findOne(query).sort({ version: -1 }).lean();
  if (!analysis) {
    // Check if the only run failed
    const failed = await Analysis.findOne({ claimId, state: 'unavailable' }).lean();
    if (failed) {
      throw new AnalysisUnavailableError('Analysis failed and is unavailable');
    }
    throw new NotFoundError('No ready analysis found for this claim');
  }

  // Merge finding dispositions
  const reviews = await FindingReview.find({
    claimId,
    analysisVersion: analysis.version,
  }).lean();
  const reviewMap = new Map(reviews.map((r) => [r.findingId, r]));

  const mergedFindings = (analysis.findings || []).map((f) => {
    const rev = reviewMap.get(f.id);
    return {
      ...f,
      status: rev ? rev.status : 'open',
      dispositionReason: rev ? rev.reason : null,
    };
  });

  // Merge matrix annotations
  const annotations = await MatrixAnnotation.find({
    claimId,
    analysisVersion: analysis.version,
  }).lean();
  const annotationMap = new Map(annotations.map((a) => [a.rowId, a]));

  const matrix = analysis.matrix || { columns: [], rows: [] };
  const mergedRows = (matrix.rows || []).map((row) => {
    const ann = annotationMap.get(row.id);
    return {
      ...row,
      annotation: ann ? { text: ann.text, by: ann.by, at: ann.at } : null,
    };
  });

  return {
    version: analysis.version,
    createdAt: analysis.createdAt,
    model: analysis.model,
    aiStatus: analysis.aiStatus,
    summary: analysis.summary,
    extractedFacts: analysis.extractedFacts || [],
    regions: analysis.regions || {},
    matrix: {
      columns: matrix.columns || [],
      rows: mergedRows,
    },
    findings: mergedFindings,
    missingEvidence: analysis.missingEvidence || [],
    policy: analysis.policy || { clauses: [], coverage: [] },
    settlement: analysis.settlement || null,
    warnings: analysis.warnings || [],
  };
}

export async function updateFindingDisposition(actor, claimId, findingId, { status, reason }) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  if (!['useful', 'dismissed', 'clarification_requested'].includes(status)) {
    throw new ValidationError("Invalid status. Allowed: 'useful', 'dismissed', 'clarification_requested'", [
      { field: 'status', message: 'Status must be useful, dismissed, or clarification_requested' },
    ]);
  }

  if (status === 'dismissed' && (!reason || reason.trim().length < 3)) {
    throw new ValidationError('A reason is required when dismissing a finding', [
      { field: 'reason', message: 'Reason must be at least 3 characters' },
    ]);
  }

  const latestVersion = claim.latestAnalysisVersion || 1;

  const review = await FindingReview.findOneAndUpdate(
    { claimId, analysisVersion: latestVersion, findingId },
    {
      status,
      reason: reason || null,
      by: { id: actor.id, name: actor.name },
      at: new Date(),
    },
    { upsert: true, new: true }
  );

  await logTimelineEvent({
    claimId,
    kind: 'finding_reviewed',
    summary: `Finding '${findingId}' marked as ${status}`,
    actor,
    visibility: 'verifier',
    metadata: { findingId, status, reason },
  });

  return review;
}

export async function annotateMatrixRow(actor, claimId, { rowId, text }) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  if (!rowId || !text || !text.trim()) {
    throw new ValidationError('rowId and non-empty text are required', [
      { field: 'text', message: 'Annotation text is required' },
    ]);
  }

  const latestVersion = claim.latestAnalysisVersion || 1;

  const annotation = await MatrixAnnotation.findOneAndUpdate(
    { claimId, analysisVersion: latestVersion, rowId },
    {
      text: text.trim(),
      by: { id: actor.id, name: actor.name },
      at: new Date(),
    },
    { upsert: true, new: true }
  );

  return annotation;
}
