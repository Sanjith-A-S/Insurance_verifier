/**
 * Derives role-projected nextStep and stage for a claim summary.
 * Pure function: takes claim object and actor role.
 */
export function deriveNextStep(claim, role, context = {}) {
  const { status, checklist = [], latestAnalysisVersion } = claim;
  const { openRequestsCount = 0, openFindingsCount = 0 } = context;

  const hasNeedsReplacement = checklist.some(
    (item) => item.status === 'needs_replacement'
  );

  if (role === 'claimant') {
    if (status === 'draft') {
      return {
        stage: 'draft',
        nextStep: {
          kind: 'submit_claim',
          label: 'Finish and submit your claim',
          description: 'Upload required documents and submit your claim for review.',
        },
      };
    }

    if (hasNeedsReplacement) {
      return {
        stage: 'awaiting_evidence',
        nextStep: {
          kind: 'replace_file',
          label: 'Replace a file',
          description: 'A file you uploaded requires replacement. Please review and re-upload.',
        },
      };
    }

    if (status === 'awaiting_claimant' || openRequestsCount > 0) {
      return {
        stage: 'awaiting_evidence',
        nextStep: {
          kind: 'provide_evidence',
          label: 'Provide the requested evidence',
          description: 'The investigator has requested additional information or evidence.',
        },
      };
    }

    if (status === 'new' || status === 'in_review') {
      return {
        stage: 'under_review',
        nextStep: {
          kind: 'await_review',
          label: "We're reviewing your claim",
          description: 'Our team is reviewing your documents and accident details.',
        },
      };
    }

    if (status === 'decision_pending') {
      return {
        stage: 'decision_pending',
        nextStep: {
          kind: 'final_checks',
          label: 'Final checks in progress',
          description: 'The review is near completion. A decision will be published soon.',
        },
      };
    }

    if (status === 'completed') {
      return {
        stage: 'completed',
        nextStep: {
          kind: 'completed',
          label: 'Claim closed',
          description: 'This claim investigation has been closed.',
        },
      };
    }
  }

  // Verifier role
  if (status === 'new') {
    return {
      stage: 'new',
      nextStep: {
        kind: 'start_review',
        label: 'Start review',
        description: 'Assign or open the claim to initiate the verification workflow.',
      },
    };
  }

  if (status === 'in_review') {
    if (!latestAnalysisVersion) {
      return {
        stage: 'in_review',
        nextStep: {
          kind: 'run_analysis',
          label: 'Run analysis',
          description: 'Execute the AI & deterministic rules pipeline to cross-check facts.',
        },
      };
    }
    if (openFindingsCount > 0) {
      return {
        stage: 'in_review',
        nextStep: {
          kind: 'review_findings',
          label: 'Review findings',
          description: 'Review and triage potential inconsistencies and calculation checks.',
        },
      };
    }
    return {
      stage: 'in_review',
      nextStep: {
        kind: 'assess_settlement',
        label: 'Review settlement and decide',
        description: 'Check settlement calculation status and prepare decision recommendation.',
      },
    };
  }

  if (status === 'awaiting_claimant') {
    return {
      stage: 'awaiting_claimant',
      nextStep: {
        kind: 'awaiting_claimant',
        label: 'Waiting for claimant',
        description: 'Waiting for claimant response to open evidence requests.',
      },
    };
  }

  if (status === 'decision_pending') {
    return {
      stage: 'decision_pending',
      nextStep: {
        kind: 'record_decision',
        label: 'Record decision',
        description: 'Submit final investigator recommendation or close the claim.',
      },
    };
  }

  if (status === 'completed') {
    return {
      stage: 'completed',
      nextStep: {
        kind: 'completed',
        label: 'Closed',
        description: 'This claim is complete and locked for modifications.',
      },
    };
  }

  return {
    stage: status || 'under_review',
    nextStep: {
      kind: 'in_progress',
      label: 'Under review',
      description: 'Review in progress.',
    },
  };
}

