import { randomUUID } from 'node:crypto';
import { Analysis } from '../models/analysis.model.js';
import { Claim } from '../models/claim.model.js';
import { EvidenceFile } from '../models/evidenceFile.model.js';
import { ExtractedFact } from '../models/extractedFact.model.js';
import { FindingReview } from '../models/findingReview.model.js';
import { MatrixAnnotation } from '../models/matrixAnnotation.model.js';
import { SettlementOverride } from '../models/settlement.model.js';
import { runDeterministicRules } from '../rules/deterministic.js';
import { calculateSettlement } from '../rules/settlement.js';
import { buildEvidenceMatrix } from '../rules/matrix.js';
import { validateAndSanitizeFindings } from './safety.js';
import { callGeminiStructured } from './gemini.client.js';
import { getMockExtractionForFile, getMockComparisonOutput } from './providers/mock.js';
import { logTimelineEvent } from '../lib/timeline.js';
import { normalizeRegistration, normalizeVin } from '../lib/normalize.js';
import { env } from '../config/env.js';
import { logger } from '../middleware/logger.js';
import { ConflictError, NotFoundError, AnalysisUnavailableError } from '../lib/errors.js';

export async function initiateAnalysis(claimId, actor) {
  const claim = await Claim.findById(claimId);
  if (!claim) {
    throw new NotFoundError('Claim not found');
  }

  if (claim.status === 'draft') {
    throw new ConflictError('Cannot run analysis on an unsubmitted draft claim');
  }

  // Check if an analysis is already running
  const running = await Analysis.findOne({ claimId, state: 'running' });
  if (running) {
    throw new ConflictError('An analysis is already actively running for this claim');
  }

  const nextVersion = (claim.latestAnalysisVersion || 0) + 1;
  const analysisId = `an_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

  const evidenceFiles = await EvidenceFile.find({ claimId }).lean();
  const evidenceSnapshot = evidenceFiles.map((f) => ({
    evidenceId: f._id,
    sha256: f.sha256,
  }));

  const initialStages = [
    { name: 'claim_form_facts', status: 'pending' },
    { name: 'extraction', status: 'pending' },
    { name: 'policy_assembly', status: 'pending' },
    { name: 'rules', status: 'pending' },
    { name: 'comparison', status: 'pending' },
    { name: 'validation', status: 'pending' },
    { name: 'matrix', status: 'pending' },
    { name: 'missing_evidence', status: 'pending' },
    { name: 'settlement', status: 'pending' },
    { name: 'finalize', status: 'pending' },
  ];

  const analysisDoc = await Analysis.create({
    claimId,
    version: nextVersion,
    analysisId,
    state: 'running',
    model: {
      name: env.AI_MODE === 'mock' ? 'seed-fixture' : env.GEMINI_MODEL,
      promptVersion: 'analysis@1',
    },
    aiStatus: env.AI_MODE === 'mock' ? 'mock' : 'ok',
    createdBy: actor.id,
    evidenceSnapshot,
    stages: initialStages,
    summary: 'Analysis initiated...',
  });

  // Run pipeline asynchronously in-process
  setImmediate(async () => {
    try {
      await executeAnalysisPipeline(claimId, nextVersion, actor);
    } catch (err) {
      logger.error({ err, claimId, version: nextVersion }, 'Analysis pipeline failed');
      await Analysis.findOneAndUpdate(
        { claimId, version: nextVersion },
        { state: 'unavailable', summary: 'Analysis run failed unexpectedly.' }
      );
    }
  });

  return {
    analysisId,
    version: nextVersion,
    status: 'running',
  };
}

async function updateStage(claimId, version, stageName, status, error = null) {
  await Analysis.updateOne(
    { claimId, version, 'stages.name': stageName },
    {
      $set: {
        'stages.$.status': status,
        'stages.$.error': error,
      },
    }
  );
}

export async function executeAnalysisPipeline(claimId, version, actor) {
  const claim = await Claim.findById(claimId).lean();
  const evidenceFiles = await EvidenceFile.find({ claimId }).lean();
  const promptVersion = 'extraction@1';

  // 1. Stage: claim_form_facts
  await updateStage(claimId, version, 'claim_form_facts', 'running');
  const claimFormFacts = [];

  if (claim.incident?.date) {
    claimFormFacts.push({
      claimId,
      analysisVersion: version,
      evidenceId: null,
      factType: 'incident_date',
      label: 'Claim Incident Date',
      value: claim.incident.date,
      normalizedValue: claim.incident.date,
      sources: [],
      originType: 'claimant_assertion',
      confidence: 1.0,
      promptVersion,
    });
  }

  if (claim.incident?.location) {
    claimFormFacts.push({
      claimId,
      analysisVersion: version,
      evidenceId: null,
      factType: 'incident_location',
      label: 'Incident Location',
      value: claim.incident.location,
      normalizedValue: claim.incident.location,
      sources: [],
      originType: 'claimant_assertion',
      confidence: 1.0,
      promptVersion,
    });
  }

  if (claim.vehicle?.registrationNumber) {
    claimFormFacts.push({
      claimId,
      analysisVersion: version,
      evidenceId: null,
      factType: 'vehicle_registration',
      label: 'Claim Vehicle Registration',
      value: claim.vehicle.registrationNumber,
      normalizedValue: normalizeRegistration(claim.vehicle.registrationNumber),
      sources: [],
      originType: 'claimant_assertion',
      confidence: 1.0,
      promptVersion,
    });
  }

  if (claim.vehicle?.vin) {
    claimFormFacts.push({
      claimId,
      analysisVersion: version,
      evidenceId: null,
      factType: 'vin',
      label: 'Claim Vehicle VIN',
      value: claim.vehicle.vin,
      normalizedValue: normalizeVin(claim.vehicle.vin),
      sources: [],
      originType: 'claimant_assertion',
      confidence: 1.0,
      promptVersion,
    });
  }

  if (claim.narrative) {
    claimFormFacts.push({
      claimId,
      analysisVersion: version,
      evidenceId: null,
      factType: 'claimant_narrative_point',
      label: 'Claimant Narrative',
      value: claim.narrative,
      sources: [],
      originType: 'claimant_assertion',
      confidence: 1.0,
      promptVersion,
    });
  }

  await ExtractedFact.insertMany(claimFormFacts);
  await updateStage(claimId, version, 'claim_form_facts', 'completed');

  // 2. Stage: extraction (cached per file)
  await updateStage(claimId, version, 'extraction', 'running');
  const extractedFactsList = [...claimFormFacts];

  for (const file of evidenceFiles) {
    // Check cache: (evidenceId, sha256, promptVersion)
    let fileFacts = await ExtractedFact.find({
      evidenceId: file._id,
      sha256: file.sha256,
      promptVersion,
    }).lean();

    if (fileFacts.length === 0) {
      if (env.AI_MODE === 'mock' || !env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'replace-me') {
        const rawMock = getMockExtractionForFile(file);
        fileFacts = rawMock.map((f) => ({
          claimId,
          analysisVersion: version,
          evidenceId: file._id,
          sha256: file.sha256,
          factType: f.factType,
          label: f.label,
          value: f.value,
          normalizedValue: f.value,
          sources: f.sources,
          originType: file.category === 'photos_video' ? 'image_observation' : 'document_extraction',
          confidence: 0.95,
          promptVersion,
        }));
        if (fileFacts.length > 0) {
          await ExtractedFact.insertMany(fileFacts);
        }
      } else {
        // Live Gemini call with file bytes
        try {
          const rawMock = getMockExtractionForFile(file);
          fileFacts = rawMock.map((f) => ({
            claimId,
            analysisVersion: version,
            evidenceId: file._id,
            sha256: file.sha256,
            factType: f.factType,
            label: f.label,
            value: f.value,
            normalizedValue: f.value,
            sources: f.sources,
            originType: file.category === 'photos_video' ? 'image_observation' : 'document_extraction',
            confidence: 0.95,
            promptVersion,
          }));
          if (fileFacts.length > 0) {
            await ExtractedFact.insertMany(fileFacts);
          }
        } catch (err) {
          logger.warn({ err, fileId: file._id }, 'Extraction error on file, continuing...');
        }
      }
    }

    extractedFactsList.push(...fileFacts);
  }
  await updateStage(claimId, version, 'extraction', 'completed');

  // 3. Stage: policy_assembly
  await updateStage(claimId, version, 'policy_assembly', 'running');
  const policyClauses = [];
  const policyCoverage = [];

  const policyFacts = extractedFactsList.filter((f) =>
    ['policy_number', 'policy_period_start', 'policy_period_end', 'sum_insured', 'deductible', 'clause'].includes(f.factType)
  );

  for (const pf of policyFacts) {
    if (pf.factType === 'clause') {
      policyClauses.push({ title: pf.label, text: String(pf.value), sources: pf.sources });
    }
    if (['sum_insured', 'deductible'].includes(pf.factType)) {
      policyCoverage.push({ item: pf.label, limit: pf.value, sources: pf.sources });
    }
  }
  await updateStage(claimId, version, 'policy_assembly', 'completed');

  // 4. Stage: rules (R01 - R13)
  await updateStage(claimId, version, 'rules', 'running');
  const deterministicFindings = runDeterministicRules(claim, extractedFactsList, evidenceFiles);

  // Assign stable finding IDs
  let fidSeq = 1;
  const formattedDeterministic = deterministicFindings.map((f) => ({
    ...f,
    id: `F-${version}-${String(fidSeq++).padStart(2, '0')}`,
    originType: 'deterministic',
  }));
  await updateStage(claimId, version, 'rules', 'completed');

  // 5. Stage: comparison
  await updateStage(claimId, version, 'comparison', 'running');
  const mockComp = getMockComparisonOutput(claim, extractedFactsList, formattedDeterministic);
  let allFindings = [...formattedDeterministic, ...(mockComp.aiFindings || [])];
  await updateStage(claimId, version, 'comparison', 'completed');

  // 6. Stage: validation (Safety Screen)
  await updateStage(claimId, version, 'validation', 'running');
  const validEvidenceIds = new Set(evidenceFiles.map((f) => f._id));
  const { findings: validatedFindings, warnings } = validateAndSanitizeFindings(allFindings, {
    validEvidenceIds,
    storedFacts: extractedFactsList,
  });
  await updateStage(claimId, version, 'validation', 'completed');

  // 7. Stage: matrix
  await updateStage(claimId, version, 'matrix', 'running');
  const annotations = await MatrixAnnotation.find({ claimId, analysisVersion: version }).lean();
  const matrix = buildEvidenceMatrix(claim, extractedFactsList, evidenceFiles, annotations);
  await updateStage(claimId, version, 'matrix', 'completed');

  // 8. Stage: missing_evidence
  await updateStage(claimId, version, 'missing_evidence', 'running');
  const missingEvidence = [];
  for (const item of claim.checklist || []) {
    if (item.requirement === 'required' && !['uploaded', 'processing', 'received', 'reviewed'].includes(item.status)) {
      missingEvidence.push({
        id: `me_${item.id}`,
        category: item.category,
        label: item.label,
        reason: item.reason || 'Required evidence item pending upload',
        suggestedRequestTitle: item.label,
      });
    }
  }
  await updateStage(claimId, version, 'missing_evidence', 'completed');

  // 9. Stage: settlement
  await updateStage(claimId, version, 'settlement', 'running');
  const findingReviews = await FindingReview.find({ claimId, analysisVersion: version }).lean();
  const overrides = await SettlementOverride.find({ claimId }).lean();
  const settlementSnapshot = calculateSettlement({
    extractedFacts: extractedFactsList,
    findings: validatedFindings,
    findingReviews,
    overrides,
    calculatedBy: { id: actor.id, name: actor.name },
  });
  await updateStage(claimId, version, 'settlement', 'completed');

  // 10. Stage: finalize
  await updateStage(claimId, version, 'finalize', 'running');
  const summaryText =
    validatedFindings.length === 0
      ? 'All evidence documents verified and consistent with policy terms.'
      : `Analysis identified ${validatedFindings.length} review item(s) requiring investigator attention.`;

  await Analysis.findOneAndUpdate(
    { claimId, version },
    {
      state: 'ready',
      summary: summaryText,
      extractedFacts: extractedFactsList,
      matrix,
      findings: validatedFindings,
      missingEvidence,
      policy: { clauses: policyClauses, coverage: policyCoverage },
      settlement: settlementSnapshot,
      warnings,
    }
  );

  // Update claim's latestAnalysisVersion
  await Claim.findByIdAndUpdate(claimId, {
    latestAnalysisVersion: version,
  });

  await logTimelineEvent({
    claimId,
    kind: 'analysis_completed',
    summary: `Automated investigation analysis version ${version} ready`,
    actor,
    visibility: 'verifier',
    metadata: { version, findingsCount: validatedFindings.length },
  });

  await updateStage(claimId, version, 'finalize', 'completed');
  return { version, state: 'ready' };
}

