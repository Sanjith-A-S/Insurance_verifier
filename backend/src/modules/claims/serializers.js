import { deriveNextStep } from '../../lib/nextStep.js';
import { computeChecklistProgress } from '../../rules/checklist.rules.js';

export function serializeClaimSummary(claim, role, context = {}) {
  const {
    claimantMap = {},
    assigneeMap = {},
    unreadCounts = {},
    openRequestsCount = 0,
    openFindingsCount = 0,
  } = context;

  const claimantUser = claimantMap[claim.claimantId];
  const assigneeUser = claim.assigneeId ? assigneeMap[claim.assigneeId] : null;

  const { checklistProgress, missingEvidenceCount } = computeChecklistProgress(claim.checklist);
  const { stage, nextStep } = deriveNextStep(claim, role, {
    openRequestsCount,
    openFindingsCount,
  });

  const base = {
    id: claim._id || claim.id,
    claimantId: claim.claimantId,
    status: claim.status,
    priority: claim.priority || 'medium',
    stage,
    incident: {
      date: claim.incident?.date || '',
      type: claim.incident?.type || 'collision',
      location: claim.incident?.location || '',
    },
    vehicle: {
      registrationNumber: claim.vehicle?.registrationNumber || '',
      make: claim.vehicle?.make || '',
      model: claim.vehicle?.model || '',
      year: claim.vehicle?.year || 2024,
    },
    submittedAt: claim.submittedAt,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    checklistProgress,
    missingEvidenceCount,
    openRequestCount: openRequestsCount,
    unreadMessageCount: unreadCounts[claim._id || claim.id] || 0,
    nextStep,
  };

  if (role === 'verifier') {
    return {
      ...base,
      claimantName: claimantUser ? claimantUser.name : 'Unknown Claimant',
      assigneeId: claim.assigneeId || null,
      assigneeName: assigneeUser ? assigneeUser.name : null,
      analysisState: claim.latestAnalysisVersion ? 'ready' : 'none',
      latestAnalysisVersion: claim.latestAnalysisVersion || null,
    };
  }

  // Claimant projection: omit sensitive investigator fields
  return {
    ...base,
    claimantName: claimantUser ? claimantUser.name : 'You',
  };
}

export function serializeClaimDetail(claim, role, context = {}) {
  const summary = serializeClaimSummary(claim, role, context);

  // Filter checklist items if needed
  const checklist = (claim.checklist || []).map((item) => ({
    id: item.id,
    category: item.category,
    label: item.label,
    requirement: item.requirement,
    status: item.status,
    reason: item.reason,
    acceptableExamples: item.acceptableExamples || [],
    acceptedMimeTypes: item.acceptedMimeTypes || [],
    maxSizeMB: item.maxSizeMB || 15,
    statusChangedBy: item.statusChangedBy,
    statusChangedAt: item.statusChangedAt,
    unavailableReason: item.unavailableReason,
    evidenceIds: item.evidenceIds || [],
  }));

  const full = {
    ...summary,
    incident: {
      ...summary.incident,
      time: claim.incident?.time || '',
      timeUncertain: Boolean(claim.incident?.timeUncertain),
      thirdPartyInvolved: claim.incident?.thirdPartyInvolved || 'no',
      policeReportFiled: claim.incident?.policeReportFiled || 'no',
      visibleDamageAreas: claim.incident?.visibleDamageAreas || [],
    },
    vehicle: {
      ...summary.vehicle,
      vin: claim.vehicle?.vin || '',
    },
    driver: {
      isPolicyholder: Boolean(claim.driver?.isPolicyholder),
      name: claim.driver?.name || '',
      relationship: claim.driver?.relationship || 'Self',
      licenceNumber: claim.driver?.licenceNumber || '',
    },
    narrative: claim.narrative || '',
    policy: {
      policyNumber: claim.policy?.policyNumber || '',
      insurer: claim.policy?.insurer || '',
    },
    checklist,
  };

  return full;
}

