import { ClaimMessage } from '../../models/claimMessage.model.js';
import { EvidenceFile } from '../../models/evidenceFile.model.js';
import {
  loadClaimForActor,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import { ValidationError, NotFoundError } from '../../lib/errors.js';

export async function listMessages(actor, claimId) {
  await loadClaimForActor(claimId, actor);

  const messages = await ClaimMessage.find({ claimId }).sort({ createdAt: 1 }).lean();

  // Resolve attachments
  const allAttachmentIds = messages.flatMap((m) => m.attachmentEvidenceIds || []);
  const attachments = await EvidenceFile.find({ _id: { $in: allAttachmentIds } }).lean();
  const attachmentMap = new Map(attachments.map((a) => [a._id, a]));

  return messages.map((m) => ({
    id: m._id.toString(),
    claimId: m.claimId,
    sender: m.sender,
    body: m.body,
    kind: m.kind,
    requestId: m.requestId,
    attachments: (m.attachmentEvidenceIds || [])
      .map((id) => attachmentMap.get(id))
      .filter(Boolean)
      .map((a) => ({
        id: a._id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    createdAt: m.createdAt,
    read: Array.isArray(m.readBy) && m.readBy.includes(actor.id),
  }));
}

export async function postMessage(actor, claimId, { body, attachmentEvidenceIds = [] }) {
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  if (!body || typeof body !== 'string' || body.trim().length === 0 || body.length > 4000) {
    throw new ValidationError('Message body must be between 1 and 4000 characters', [
      { field: 'body', message: 'Body must be 1 to 4000 characters' },
    ]);
  }

  // Verify attachment evidence IDs belong to this claim
  if (attachmentEvidenceIds.length > 0) {
    const validCount = await EvidenceFile.countDocuments({
      claimId,
      _id: { $in: attachmentEvidenceIds },
    });
    if (validCount !== attachmentEvidenceIds.length) {
      throw new ValidationError('One or more attachments do not belong to this claim', [
        { field: 'attachmentEvidenceIds', message: 'Invalid attachment evidence IDs' },
      ]);
    }
  }

  const message = await ClaimMessage.create({
    claimId,
    sender: {
      id: actor.id,
      name: actor.name,
      role: actor.role,
    },
    body: body.trim(),
    attachmentEvidenceIds,
    kind: 'message',
    readBy: [actor.id], // Sender has read their own message
  });

  await logTimelineEvent({
    claimId,
    kind: 'message_sent',
    summary: `${actor.name} sent a message`,
    actor,
    visibility: 'claimant', // Visible to claimant and verifier
    metadata: { messageId: message._id.toString() },
  });

  return {
    id: message._id.toString(),
    claimId: message.claimId,
    sender: message.sender,
    body: message.body,
    kind: message.kind,
    attachments: [],
    createdAt: message.createdAt,
    read: true,
  };
}

export async function markMessagesAsRead(actor, claimId) {
  await loadClaimForActor(claimId, actor);

  await ClaimMessage.updateMany(
    { claimId, readBy: { $ne: actor.id } },
    { $addToSet: { readBy: actor.id } }
  );

  return { ok: true };
}
