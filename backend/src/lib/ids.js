import { Counter } from '../models/counter.model.js';
import { Claim } from '../models/claim.model.js';

export async function generateClaimId() {
  let counter = await Counter.findById('claimNumber');
  if (!counter) {
    try {
      counter = await Counter.create({ _id: 'claimNumber', seq: 2051 });
    } catch {
      // In case of concurrent insert
      counter = await Counter.findById('claimNumber');
    }
  }

  const updated = await Counter.findByIdAndUpdate(
    'claimNumber',
    { $inc: { seq: 1 } },
    { new: true }
  );

  return `CL-${updated.seq}`;
}

export async function generateEvidenceId(claimId) {
  const claim = await Claim.findByIdAndUpdate(
    claimId,
    { $inc: { evidenceSeq: 1 } },
    { new: true }
  );
  if (!claim) {
    throw new Error(`Cannot generate evidence ID for non-existent claim ${claimId}`);
  }
  const padded = String(claim.evidenceSeq).padStart(2, '0');
  return `EV-${claimId}-${padded}`;
}

export function isValidClaimId(id) {
  return typeof id === 'string' && /^CL-\d{4,}$/.test(id);
}

export function isValidEvidenceId(id) {
  return typeof id === 'string' && /^EV-CL-\d{4,}-\d{2,}$/.test(id);
}
