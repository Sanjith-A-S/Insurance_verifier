import { NotFoundError, ForbiddenError, ConflictError } from './errors.js';
import { Claim } from '../models/claim.model.js';
import { logTimelineEvent } from './timeline.js';

/**
 * Loads a claim ensuring the actor has permission to access it.
 * If unauthorized or missing, throws 404 NOT_FOUND (never 403 to prevent existence leakage).
 */
export async function loadClaimForActor(claimId, actor) {
  if (!actor || !actor.id || !actor.role) {
    throw new NotFoundError('Claim not found or inaccessible');
  }

  const claim = await Claim.findById(claimId);
  if (!claim) {
    throw new NotFoundError('Claim not found or inaccessible');
  }

  if (actor.role === 'claimant') {
    if (claim.claimantId !== actor.id) {
      throw new NotFoundError('Claim not found or inaccessible');
    }
    return claim;
  }

  if (actor.role === 'verifier') {
    // Verifiers cannot see drafts
    if (claim.status === 'draft') {
      throw new NotFoundError('Claim not found or inaccessible');
    }
    // Verifiers can see unassigned claims OR claims assigned to themselves
    if (claim.assigneeId && claim.assigneeId !== actor.id) {
      throw new NotFoundError('Claim not found or inaccessible');
    }
    return claim;
  }

  throw new NotFoundError('Claim not found or inaccessible');
}

/**
 * Asserts the actor has the required role.
 */
export function assertRole(actor, ...allowedRoles) {
  if (!actor || !allowedRoles.includes(actor.role)) {
    throw new ForbiddenError(`Action forbidden for role: ${actor ? actor.role : 'none'}`);
  }
}

/**
 * Asserts claim is not completed/closed. Completed claims are read-only; writes throw 409 CONFLICT.
 */
export function assertWritable(claim) {
  if (claim.status === 'completed') {
    throw new ConflictError('Claim is closed and cannot be modified');
  }
}

/**
 * Auto-assigns an unassigned claim to the verifier on first write action,
 * and moves status from 'new' -> 'in_review'.
 */
export async function autoAssignAndTransitionVerifierWrite(claim, actor) {
  if (actor.role !== 'verifier') return;

  let changed = false;
  const previousStatus = claim.status;

  if (!claim.assigneeId) {
    claim.assigneeId = actor.id;
    changed = true;
    await logTimelineEvent({
      claimId: claim._id,
      kind: 'assignment_updated',
      summary: `Claim assigned to ${actor.name}`,
      actor,
      visibility: 'verifier',
    });
  }

  if (claim.status === 'new') {
    claim.status = 'in_review';
    changed = true;
    await logTimelineEvent({
      claimId: claim._id,
      kind: 'status_changed',
      summary: 'Your claim is now being reviewed',
      actor,
      visibility: 'claimant',
      metadata: { from: previousStatus, to: 'in_review' },
    });
  }

  if (changed) {
    await claim.save();
  }
}

