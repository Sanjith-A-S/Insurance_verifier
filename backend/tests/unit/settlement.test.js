import { describe, it, expect } from 'vitest';
import { calculateSettlement } from '../../src/rules/settlement.js';

describe('Settlement Rules (Deterministic Loss Calculation)', () => {
  const baseFacts = [
    {
      factType: 'sum_insured',
      value: { amount: 500000 },
      sources: [{ evidenceId: 'EV-CL-2041-01' }],
    },
    {
      factType: 'deductible',
      value: { amount: 1000 },
      sources: [{ evidenceId: 'EV-CL-2041-01' }],
    },
    {
      factType: 'policy_period_start',
      value: '2026-01-01',
      sources: [{ evidenceId: 'EV-CL-2041-01' }],
    },
    {
      factType: 'policy_period_end',
      value: '2026-12-31',
      sources: [{ evidenceId: 'EV-CL-2041-01' }],
    },
    {
      factType: 'estimate_line_item',
      value: { label: 'Bumper replacement', amount: 35000 },
      sources: [{ evidenceId: 'EV-CL-2041-02' }],
    },
    {
      factType: 'estimate_line_item',
      value: { label: 'Headlight assembly', amount: 13600 },
      sources: [{ evidenceId: 'EV-CL-2041-02' }],
    },
  ];

  it('CL-2041 benchmark: computes ₹48,600 - ₹1,000 = ₹47,600', () => {
    // 35,000 + 13,600 = 48,600; deductible = 1,000; limit = 500,000
    const res = calculateSettlement({
      extractedFacts: baseFacts,
      findings: [],
      findingReviews: [],
    });

    expect(res.status).toBe('calculated');
    expect(res.resultAmount).toBe(47600);
    expect(res.currency).toBe('INR');
    expect(res.unresolved).toHaveLength(0);

    const estLine = res.lines.find((l) => l.kind === 'estimate_total');
    expect(estLine?.value).toBe(48600);

    const finalLine = res.lines.find((l) => l.kind === 'final_calculated');
    expect(finalLine?.value).toBe(47600);
  });

  it('caps at sum insured if estimate exceeds limit', () => {
    const highFacts = [
      ...baseFacts.filter((f) => f.factType !== 'sum_insured'),
      { factType: 'sum_insured', value: { amount: 40000 } },
    ];

    const res = calculateSettlement({
      extractedFacts: highFacts,
      findings: [],
      findingReviews: [],
    });

    expect(res.status).toBe('calculated');
    // capped at 40,000 - 1,000 = 39,000
    expect(res.resultAmount).toBe(39000);
  });

  it('yields 0 if deductible exceeds eligible estimate amount', () => {
    const highDeductible = [
      ...baseFacts.filter((f) => f.factType !== 'deductible'),
      { factType: 'deductible', value: { amount: 50000 } },
    ];

    const res = calculateSettlement({
      extractedFacts: highDeductible,
      findings: [],
      findingReviews: [],
    });

    expect(res.status).toBe('calculated');
    expect(res.resultAmount).toBe(0);
  });

  it('status is withheld with no resultAmount when an unresolved blocker exists', () => {
    const findings = [
      {
        id: 'F-1-01',
        title: 'Estimate Total Discrepancy',
        blocksSettlement: true,
      },
    ];

    const res = calculateSettlement({
      extractedFacts: baseFacts,
      findings,
      findingReviews: [],
    });

    expect(res.status).toBe('withheld');
    expect(res.resultAmount).toBeNull();
    expect(res.unresolved.length).toBeGreaterThan(0);
    expect(res.unresolved[0].id).toBe('unresolved_finding_F-1-01');
  });

  it('dismissed finding clears its blocker allowing calculation', () => {
    const findings = [
      {
        id: 'F-1-01',
        title: 'Registration Typo',
        blocksSettlement: true,
      },
    ];

    const findingReviews = [
      {
        findingId: 'F-1-01',
        status: 'dismissed',
        reason: 'Typo confirmed against original RC scan',
      },
    ];

    const res = calculateSettlement({
      extractedFacts: baseFacts,
      findings,
      findingReviews,
    });

    expect(res.status).toBe('calculated');
    expect(res.resultAmount).toBe(47600);
  });
});

