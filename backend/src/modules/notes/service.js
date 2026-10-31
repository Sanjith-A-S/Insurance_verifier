import { PrivateNote } from '../../models/privateNote.model.js';
import {
  loadClaimForActor,
  assertRole,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import { ValidationError } from '../../lib/errors.js';

export async function listPrivateNotes(actor, claimId) {
  assertRole(actor, 'verifier'); // Claimants strictly forbidden (403)
  await loadClaimForActor(claimId, actor);

  const notes = await PrivateNote.find({ claimId }).sort({ createdAt: -1 }).lean();
  return notes.map((n) => ({
    id: n._id.toString(),
    claimId: n.claimId,
    author: n.author,
    body: n.body,
    createdAt: n.createdAt,
  }));
}

export async function createPrivateNote(actor, claimId, { body }) {
  assertRole(actor, 'verifier'); // Claimants strictly forbidden (403)
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    throw new ValidationError('Note body cannot be empty', [
      { field: 'body', message: 'Note body is required' },
    ]);
  }

  const note = await PrivateNote.create({
    claimId,
    author: { id: actor.id, name: actor.name },
    body: body.trim(),
  });

  // Log timeline event WITHOUT body text (verifier visibility only)
  await logTimelineEvent({
    claimId,
    kind: 'private_note_added',
    summary: `${actor.name} recorded an internal investigator note`,
    actor,
    visibility: 'verifier',
    metadata: { noteId: note._id.toString() },
  });

  return {
    id: note._id.toString(),
    claimId: note.claimId,
    author: note.author,
    body: note.body,
    createdAt: note.createdAt,
  };
}

