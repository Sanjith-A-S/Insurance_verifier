import { formatRupees } from '../lib/money.js';

/**
 * Deterministic settlement calculation engine.
 * Pure function: takes facts, findings, finding review dispositions, and overrides.
 */
export function calculateSettlement({
  extractedFacts = [],
  findings = [],
  findingReviews = [],
  overrides = [],
  calculatedBy = { id: 'system', name: 'System' },
}) {
  const unresolved = [];
  const assumptions = [
    'All itemised estimate lines treated as eligible',
    'Illustrative demo formula; not an insurer settlement formula; not a payment authorisation',
  ];
  const formula = 'result = max(0, min(eligible, limit) - deductible)';

  // Helper to extract fact values
  const getFirstFact = (type) => extractedFacts.find((f) => f.factType === type);
  const getFacts = (type) => extractedFacts.filter((f) => f.factType === type);

  // 1. Check Policy & Coverage Facts
  const sumInsuredFact = getFirstFact('sum_insured');
  const deductibleFact = getFirstFact('deductible');
  const policyStartFact = getFirstFact('policy_period_start');
  const policyEndFact = getFirstFact('policy_period_end');

  if (!sumInsuredFact) {
    unresolved.push({
      id: 'unresolved_sum_insured',
      message: 'Policy sum insured / IDV limit is unknown or unextracted',
      suggestedRequestTitle: 'Policy Schedule with Insured Declared Value (IDV)',
    });
  }

  if (!deductibleFact) {
    unresolved.push({
      id: 'unresolved_deductible',
      message: 'Compulsory policy deductible could not be verified from policy terms',
      suggestedRequestTitle: 'Policy Terms with Compulsory Deductible Schedule',
    });
  }

  if (!policyStartFact || !policyEndFact) {
    unresolved.push({
      id: 'unresolved_policy_period',
      message: 'Policy validity period is missing or incomplete',
      suggestedRequestTitle: 'Policy Renewal Schedule Certificate',
    });
  }

  // 2. Check Itemised Estimate Lines
  const estimateLineFacts = getFacts('estimate_line_item');
  if (estimateLineFacts.length === 0) {
    unresolved.push({
      id: 'unresolved_estimate_lines',
      message: 'No itemised repair estimate lines available for loss assessment',
      suggestedRequestTitle: 'Detailed Itemised Workshop Repair Estimate',
    });
  }

  // 3. Check Finding Dispositions for Blockers (R01-R05, R10, R13)
  const reviewMap = new Map();
  for (const rev of findingReviews) {
    reviewMap.set(rev.findingId, rev);
  }

  for (const finding of findings) {
    if (finding.blocksSettlement) {
      const review = reviewMap.get(finding.id);
      // A verifier dismissal clears that finding's block; clarification_requested or open keeps it blocked
      const isDismissed = review && review.status === 'dismissed';
      if (!isDismissed) {
        unresolved.push({
          id: `unresolved_finding_${finding.id}`,
          message: `Open finding blocker: ${finding.title}`,
          suggestedRequestTitle: finding.suggestedRequestTitle || 'Additional Supporting Documentation',
        });
      }
    }
  }

  // Parse values
  const lines = [];

  let sumInsured = sumInsuredFact ? parseFloat(sumInsuredFact.value?.amount || sumInsuredFact.value) : 0;
  if (isNaN(sumInsured)) sumInsured = 0;

  let deductible = deductibleFact ? parseFloat(deductibleFact.value?.amount || deductibleFact.value) : 0;
  if (isNaN(deductible)) deductible = 0;

  let totalEstimate = 0;
  for (const line of estimateLineFacts) {
    const val = parseFloat(line.value?.amount || line.value);
    const amount = isNaN(val) ? 0 : val;
    totalEstimate += amount;
  }

  // Populate calculation lines
  if (totalEstimate > 0) {
    lines.push({
      label: 'Total Itemised Repair Estimate',
      value: formatRupees(totalEstimate),
      kind: 'estimate_total',
      source: estimateLineFacts[0]?.sources?.[0]?.evidenceId || 'estimate',
      note: `${estimateLineFacts.length} itemised lines`,
    });
  }

  if (sumInsuredFact) {
    lines.push({
      label: 'Policy Sum Insured Limit (IDV)',
      value: formatRupees(sumInsured),
      kind: 'sublimit',
      source: sumInsuredFact.sources?.[0]?.evidenceId || 'policy',
    });
  }

  if (deductibleFact) {
    lines.push({
      label: 'Compulsory Deductible',
      value: formatRupees(deductible),
      kind: 'deductible',
      source: deductibleFact.sources?.[0]?.evidenceId || 'policy',
    });
  }

  // If there are unresolved blockers, status is 'withheld'
  if (unresolved.length > 0) {
    return {
      status: 'withheld',
      currency: 'INR',
      lines,
      formula,
      assumptions,
      unresolved,
      resultAmount: null,
      overrides: overrides.map((o) => ({
        amount: formatRupees(o.amount),
        rationale: o.rationale,
        by: o.by,
        at: o.at,
      })),
      calculatedAt: new Date(),
      calculatedBy,
    };
  }

  // Deterministic calculation:
  // eligible = totalEstimate
  // capped = min(eligible, sumInsured)
  // result = max(0, capped - deductible)
  const eligible = totalEstimate;
  const capped = sumInsured > 0 ? Math.min(eligible, sumInsured) : eligible;
  const result = Math.max(0, capped - deductible);

  lines.push({
    label: 'Eligible Assessment Amount',
    value: formatRupees(capped),
    kind: 'eligible_amount',
  });

  lines.push({
    label: 'Final Calculated Settlement',
    value: formatRupees(result),
    kind: 'final_calculated',
    note: `₹${formatRupees(capped)} - ₹${formatRupees(deductible)}`,
  });

  return {
    status: 'calculated',
    currency: 'INR',
    lines,
    formula,
    assumptions,
    unresolved: [],
    resultAmount: formatRupees(result),
    overrides: overrides.map((o) => ({
      amount: formatRupees(o.amount),
      rationale: o.rationale,
      by: o.by,
      at: o.at,
    })),
    calculatedAt: new Date(),
    calculatedBy,
  };
}
