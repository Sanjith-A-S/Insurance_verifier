import { describe, it, expect } from 'vitest';
import { deriveNextStep } from '../../src/lib/nextStep.js';

describe('deriveNextStep', () => {
  it('returns finish and submit for claimant draft', () => {
    const claim = { status: 'draft', checklist: [] };
    const res = deriveNextStep(claim, 'claimant');
    expect(res.stage).toBe('draft');
    expect(res.nextStep.label).toBe('Finish and submit your claim');
  });

  it('returns replace a file when item has needs_replacement', () => {
    const claim = {
      status: 'in_review',
      checklist: [{ id: 'rc', status: 'needs_replacement' }],
    };
    const res = deriveNextStep(claim, 'claimant');
    expect(res.stage).toBe('awaiting_evidence');
    expect(res.nextStep.label).toBe('Replace a file');
  });

  it('returns provide evidence when claimant has open requests', () => {
    const claim = { status: 'awaiting_claimant', checklist: [] };
    const res = deriveNextStep(claim, 'claimant', { openRequestsCount: 1 });
    expect(res.stage).toBe('awaiting_evidence');
    expect(res.nextStep.label).toBe('Provide the requested evidence');
  });

  it('returns start review for verifier on new claim', () => {
    const claim = { status: 'new', checklist: [] };
    const res = deriveNextStep(claim, 'verifier');
    expect(res.stage).toBe('new');
    expect(res.nextStep.label).toBe('Start review');
  });

  it('returns run analysis for verifier when in_review without analysis', () => {
    const claim = { status: 'in_review', checklist: [] };
    const res = deriveNextStep(claim, 'verifier');
    expect(res.stage).toBe('in_review');
    expect(res.nextStep.label).toBe('Run analysis');
  });

  it('returns review findings when analysis has open findings', () => {
    const claim = { status: 'in_review', latestAnalysisVersion: 1, checklist: [] };
    const res = deriveNextStep(claim, 'verifier', { openFindingsCount: 2 });
    expect(res.stage).toBe('in_review');
    expect(res.nextStep.label).toBe('Review findings');
  });
});
