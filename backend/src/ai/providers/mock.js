/**
 * Mock AI Provider for offline demo mode and testing.
 * Supplies realistic structured extractions and comparison findings.
 */

export function getMockExtractionForFile(evidenceFile) {
  const { category, fileName, _id: evidenceId } = evidenceFile;

  if (category === 'policy') {
    return [
      {
        factType: 'policy_number',
        label: 'Policy Number',
        value: 'POL-HYU-9921',
        sources: [{ evidenceId, page: 1, field: 'policy_number' }],
      },
      {
        factType: 'policy_period_start',
        label: 'Policy Coverage Start',
        value: '2026-01-01',
        sources: [{ evidenceId, page: 1, field: 'period_start' }],
      },
      {
        factType: 'policy_period_end',
        label: 'Policy Coverage Expiry',
        value: '2026-12-31',
        sources: [{ evidenceId, page: 1, field: 'period_end' }],
      },
      {
        factType: 'sum_insured',
        label: 'Insured Declared Value (IDV)',
        value: { amount: 500000, currency: 'INR' },
        sources: [{ evidenceId, page: 1, field: 'sum_insured' }],
      },
      {
        factType: 'deductible',
        label: 'Compulsory Deductible',
        value: { amount: 1000, currency: 'INR' },
        sources: [{ evidenceId, page: 1, field: 'deductible' }],
      },
    ];
  }

  if (category === 'vehicle_identity') {
    return [
      {
        factType: 'vehicle_registration',
        label: 'RC Vehicle Registration',
        value: 'KA-01-MJ-5021',
        sources: [{ evidenceId, page: 1, field: 'reg_no' }],
      },
      {
        factType: 'vin',
        label: 'RC Chassis Number (VIN)',
        value: 'MALC141CMKM123456',
        sources: [{ evidenceId, page: 1, field: 'vin' }],
      },
    ];
  }

  if (category === 'repair_loss') {
    return [
      {
        factType: 'estimate_line_item',
        label: 'Front Bumper Replacement',
        value: { amount: 35000, currency: 'INR' },
        sources: [{ evidenceId, page: 1, field: 'item_1' }],
      },
      {
        factType: 'estimate_line_item',
        label: 'Headlight Assembly (Right)',
        value: { amount: 13600, currency: 'INR' },
        sources: [{ evidenceId, page: 1, field: 'item_2' }],
      },
      {
        factType: 'estimate_total',
        label: 'Stated Total Repair Estimate',
        value: { amount: 48600, currency: 'INR' },
        sources: [{ evidenceId, page: 1, field: 'total' }],
      },
    ];
  }

  if (category === 'photos_video') {
    return [
      {
        factType: 'damage_observation',
        label: 'Vehicle Impact Damage',
        value: 'Visible front bumper crack and right headlight deformation',
        sources: [{ evidenceId, field: 'damage_area' }],
      },
      {
        factType: 'image_view',
        label: 'Perspective View',
        value: 'Front Three-Quarter View',
        sources: [{ evidenceId, field: 'perspective' }],
      },
    ];
  }

  return [];
}

export function getMockComparisonOutput(claim, facts, ruleFindings) {
  return {
    summary:
      'Multi-source comparison completed. Claim facts and evidence documents analyzed against policy coverage.',
    aiFindings: [],
    missingEvidenceSuggestions: [],
  };
}

