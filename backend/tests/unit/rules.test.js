import { describe, it, expect } from 'vitest';
import { runDeterministicRules } from '../../src/rules/deterministic.js';

describe('Deterministic Rules R01 - R13', () => {
  const baseClaim = {
    incident: {
      date: '2026-06-15',
      time: '14:00',
      timeUncertain: false,
      location: 'Delhi',
      visibleDamageAreas: ['front'],
    },
    vehicle: {
      registrationNumber: 'DL-01-AB-1234',
      make: 'Maruti',
      model: 'Swift',
      year: 2022,
      vin: 'MA3FBA12S00123456',
    },
    checklist: [
      { id: 'photo_front', category: 'photos_video', requirement: 'required', status: 'received' },
    ],
  };

  it('R01: blocks when incident is outside policy period', () => {
    const facts = [
      { factType: 'policy_period_start', value: '2025-01-01', sources: [{ evidenceId: 'EV-1' }] },
      { factType: 'policy_period_end', value: '2025-12-31', sources: [{ evidenceId: 'EV-1' }] },
      { factType: 'deductible', value: 1000 },
      { factType: 'sum_insured', value: 500000 },
    ];

    const findings = runDeterministicRules(baseClaim, facts);
    const r01 = findings.find((f) => f.ruleId === 'R01');
    expect(r01).toBeDefined();
    expect(r01?.blocksSettlement).toBe(true);
    expect(r01?.type).toBe('inconsistency');
  });

  it('R02: blocks when registration differs between claim and extracted facts', () => {
    const facts = [
      { factType: 'policy_period_start', value: '2026-01-01' },
      { factType: 'policy_period_end', value: '2026-12-31' },
      { factType: 'deductible', value: 1000 },
      { factType: 'sum_insured', value: 500000 },
      { factType: 'vehicle_registration', value: 'DL-01-AB-9999', label: 'RC scan', sources: [{ evidenceId: 'EV-1' }] },
    ];

    const findings = runDeterministicRules(baseClaim, facts);
    const r02 = findings.find((f) => f.ruleId === 'R02');
    expect(r02).toBeDefined();
    expect(r02?.blocksSettlement).toBe(true);
    expect(r02?.alternatives.length).toBeGreaterThan(0);
  });

  it('R03: detects VIN difference and calculates edit distance', () => {
    const facts = [
      { factType: 'policy_period_start', value: '2026-01-01' },
      { factType: 'policy_period_end', value: '2026-12-31' },
      { factType: 'deductible', value: 1000 },
      { factType: 'sum_insured', value: 500000 },
      // 1 char substitution
      { factType: 'vin', value: 'MA3FBA12S00123458', label: 'RC scan', sources: [{ evidenceId: 'EV-1' }] },
    ];

    const findings = runDeterministicRules(baseClaim, facts);
    const r03 = findings.find((f) => f.ruleId === 'R03');
    expect(r03).toBeDefined();
    expect(r03?.calculations[0]).toContain('distance: 1');
    expect(r03?.blocksSettlement).toBe(true);
  });

  it('R04: checks estimate line items sum against stated total', () => {
    const facts = [
      { factType: 'policy_period_start', value: '2026-01-01' },
      { factType: 'policy_period_end', value: '2026-12-31' },
      { factType: 'deductible', value: 1000 },
      { factType: 'sum_insured', value: 500000 },
      { factType: 'estimate_line_item', value: { amount: 30000 } },
      { factType: 'estimate_line_item', value: { amount: 20000 } }, // sum = 50,000
      { factType: 'estimate_total', value: { amount: 55000 }, sources: [{ evidenceId: 'EV-2' }] }, // stated 55,000
    ];

    const findings = runDeterministicRules(baseClaim, facts);
    const r04 = findings.find((f) => f.ruleId === 'R04');
    expect(r04).toBeDefined();
    expect(r04?.type).toBe('calculation_check');
    expect(r04?.blocksSettlement).toBe(true);
  });

  it('R10: flags missing deductible or policy period', () => {
    // Missing policy facts
    const facts = [];
    const findings = runDeterministicRules(baseClaim, facts);
    const r10 = findings.find((f) => f.ruleId === 'R10');
    expect(r10).toBeDefined();
    expect(r10?.blocksSettlement).toBe(true);
  });

  it('R13: flags unresolved reference and suggests request title', () => {
    const facts = [
      { factType: 'policy_period_start', value: '2026-01-01' },
      { factType: 'policy_period_end', value: '2026-12-31' },
      { factType: 'deductible', value: 1000 },
      { factType: 'sum_insured', value: 500000 },
      { factType: 'unresolved_reference', value: 'Zero Depreciation Annexure B missing' },
    ];

    const findings = runDeterministicRules(baseClaim, facts);
    const r13 = findings.find((f) => f.ruleId === 'R13');
    expect(r13).toBeDefined();
    expect(r13?.blocksSettlement).toBe(true);
    expect(r13?.suggestedRequestTitle).toBe('Policy Add-on Endorsement Schedule');
  });
});

