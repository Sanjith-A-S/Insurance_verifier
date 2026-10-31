import { describe, it, expect } from 'vitest';
import { generateChecklist, computeChecklistProgress } from '../../src/rules/checklist.rules.js';

describe('Checklist Rules', () => {
  it('should generate required core documents for basic collision', () => {
    const claim = {
      incident: {
        visibleDamageAreas: ['front'],
        policeReportFiled: 'no',
        thirdPartyInvolved: 'no',
      },
    };

    const checklist = generateChecklist(claim);
    expect(checklist).toBeDefined();

    const policyItem = checklist.find((i) => i.id === 'policy_schedule');
    expect(policyItem?.requirement).toBe('required');

    const rcItem = checklist.find((i) => i.id === 'rc_certificate');
    expect(rcItem?.requirement).toBe('required');

    const frontPhoto = checklist.find((i) => i.id === 'photo_front');
    expect(frontPhoto?.requirement).toBe('required');

    const rearPhoto = checklist.find((i) => i.id === 'photo_rear');
    expect(rearPhoto?.requirement).toBe('optional');

    const policeItem = checklist.find((i) => i.id === 'police_report');
    expect(policeItem?.requirement).toBe('optional');
  });

  it('should require police report when filed is yes or type is theft', () => {
    const claim = {
      incident: {
        visibleDamageAreas: [],
        policeReportFiled: 'yes',
        thirdPartyInvolved: 'no',
      },
    };

    const checklist = generateChecklist(claim);
    const policeItem = checklist.find((i) => i.id === 'police_report');
    expect(policeItem?.requirement).toBe('conditionally_required');
  });

  it('should calculate checklist progress and missing evidence count accurately', () => {
    const checklist = [
      { id: '1', requirement: 'required', status: 'uploaded' },
      { id: '2', requirement: 'required', status: 'not_started' },
      { id: '3', requirement: 'optional', status: 'not_started' },
      { id: '4', requirement: 'not_applicable', status: 'not_applicable' },
    ];

    const { checklistProgress, missingEvidenceCount } = computeChecklistProgress(checklist);
    expect(checklistProgress.applicable).toBe(3);
    expect(checklistProgress.done).toBe(1);
    expect(missingEvidenceCount).toBe(1);
  });
});

