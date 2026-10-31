import fs from 'node:fs/promises';
import { EvidenceFile } from '../../models/evidenceFile.model.js';
import { CaptureSession } from '../../models/captureSession.model.js';
import { Claim } from '../../models/claim.model.js';
import { EvidenceRequest } from '../../models/evidenceRequest.model.js';
import {
  loadClaimForActor,
  assertRole,
  assertWritable,
  autoAssignAndTransitionVerifierWrite,
} from '../../lib/access.js';
import { generateEvidenceId } from '../../lib/ids.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import {
  validateUploadedFile,
  saveFileToDisk,
  processFileMetadata,
  generateThumbnail,
  resolveStoragePath,
} from '../../lib/files.js';
import { serializeEvidenceFile } from './serializers.js';
import {
  NotFoundError,
  UploadRejectedError,
  ConflictError,
  ValidationError,
} from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { logger } from '../../middleware/logger.js';

export async function createCaptureSession(actor, claimId) {
  assertRole(actor, 'claimant');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);

  const session = await CaptureSession.create({
    claimId: claim._id,
    createdBy: actor.id,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
  });

  return {
    captureSessionId: session._id.toString(),
    claimId: claim._id,
    expiresAt: session.expiresAt,
  };
}

export async function uploadEvidence(actor, claimId, file, body = {}) {
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);

  // File count limit check
  const existingFiles = await EvidenceFile.find({ claimId }).lean();
  if (existingFiles.length >= env.MAX_FILES_PER_CLAIM) {
    throw new UploadRejectedError(
      `Claim has reached maximum file limit of ${env.MAX_FILES_PER_CLAIM} files`,
      [{ field: 'file', message: `Maximum limit of ${env.MAX_FILES_PER_CLAIM} files reached` }]
    );
  }

  const source = body.source || 'uploaded_file';
  let hasValidCaptureSession = false;

  if (source === 'captured_in_app') {
    if (!body.captureSessionId) {
      throw new UploadRejectedError('Capture session ID is required for in-app captures', [
        { field: 'captureSessionId', message: 'Capture session ID missing' },
      ]);
    }
    const session = await CaptureSession.findById(body.captureSessionId);
    if (!session || session.claimId !== claimId || session.expiresAt < new Date()) {
      throw new UploadRejectedError('Invalid, expired, or non-matching capture session', [
        { field: 'captureSessionId', message: 'Session is invalid or expired for this claim' },
      ]);
    }
    hasValidCaptureSession = true;
  }

  // Replacement verification
  let replacesId = body.replacesEvidenceId || null;
  if (replacesId) {
    const targetFile = existingFiles.find((f) => f._id === replacesId || f.id === replacesId);
    if (!targetFile) {
      throw new UploadRejectedError(`Evidence file '${replacesId}' to replace not found in this claim`, [
        { field: 'replacesEvidenceId', message: 'File to replace does not exist in claim' },
      ]);
    }
  }

  // Validate file content, extension, mime agreement
  const { ext, mime } = await validateUploadedFile(file);

  // Determine category
  let category = body.category || 'other';
  if (body.checklistItemId) {
    const item = (claim.checklist || []).find((i) => i.id === body.checklistItemId);
    if (item) {
      category = item.category;
    }
  }
  if (category === 'other' && mime.startsWith('image/')) {
    category = 'photos_video';
  }

  // Generate ID and save original bytes untouched
  const evidenceId = await generateEvidenceId(claimId);
  const { storageKey } = await saveFileToDisk(file.buffer, claimId, ext);

  // Create initial EvidenceFile record
  const evidenceDoc = await EvidenceFile.create({
    _id: evidenceId,
    claimId,
    checklistItemId: body.checklistItemId || null,
    category,
    fileName: file.originalname || `evidence.${ext}`,
    mimeType: mime,
    sizeBytes: file.buffer.length,
    sha256: 'calculating...',
    source,
    captureSessionId: hasValidCaptureSession ? body.captureSessionId : null,
    receivedAt: new Date(),
    uploadedBy: {
      id: actor.id,
      name: actor.name,
      role: actor.role,
    },
    processingStatus: 'processing',
    reviewStatus: 'pending',
    requestId: body.requestId || null,
    replacesEvidenceId: replacesId,
    storageKey,
  });

  // Handle replacement links
  if (replacesId) {
    await EvidenceFile.findByIdAndUpdate(replacesId, {
      replacedByEvidenceId: evidenceId,
    });
  }

  // Update checklist item if linked
  if (body.checklistItemId) {
    const item = claim.checklist.find((i) => i.id === body.checklistItemId);
    if (item) {
      item.status = 'uploaded';
      item.statusChangedBy = actor.id;
      item.statusChangedAt = new Date();
      if (!item.evidenceIds) item.evidenceIds = [];
      if (!item.evidenceIds.includes(evidenceId)) {
        item.evidenceIds.push(evidenceId);
      }
      await claim.save();
    }
  }

  // Auto-link to EvidenceRequest if requestId provided
  if (body.requestId) {
    const reqDoc = await EvidenceRequest.findById(body.requestId);
    if (reqDoc && reqDoc.claimId === claimId) {
      // Find latest response or create one
      let lastResp = reqDoc.responses[reqDoc.responses.length - 1];
      if (!lastResp || lastResp.by.id !== actor.id) {
        reqDoc.responses.push({
          id: `resp_${Date.now()}`,
          by: { id: actor.id, name: actor.name },
          at: new Date(),
          evidenceIds: [evidenceId],
          message: 'Evidence file uploaded',
        });
      } else {
        if (!lastResp.evidenceIds.includes(evidenceId)) {
          lastResp.evidenceIds.push(evidenceId);
        }
      }
      if (reqDoc.status === 'sent') {
        reqDoc.status = 'response_submitted';
      }
      await reqDoc.save();
    }
  }

  // Background local processing (metadata, EXIF, dHash, PDF pageCount, provenance)
  setImmediate(async () => {
    try {
      const processed = await processFileMetadata(file.buffer, mime, ext, claimId, {
        existingEvidence: existingFiles,
        hasCaptureSession: hasValidCaptureSession,
      });

      evidenceDoc.sha256 = processed.sha256;
      evidenceDoc.width = processed.width;
      evidenceDoc.height = processed.height;
      evidenceDoc.pageCount = processed.pageCount;
      evidenceDoc.perceptualHash = processed.perceptualHash;
      evidenceDoc.provenance = processed.provenance;
      evidenceDoc.processingStatus = 'received';
      await evidenceDoc.save();

      // Flip linked checklist item from uploaded -> received
      if (body.checklistItemId) {
        const c = await Claim.findById(claimId);
        if (c) {
          const item = c.checklist.find((i) => i.id === body.checklistItemId);
          if (item && item.status === 'uploaded') {
            item.status = 'received';
            item.statusChangedBy = 'system';
            item.statusChangedAt = new Date();
            await c.save();
          }
        }
      }
    } catch (err) {
      logger.error({ err, evidenceId }, 'Error during local evidence file processing');
      evidenceDoc.processingStatus = 'failed';
      await evidenceDoc.save();
    }
  });

  return serializeEvidenceFile(evidenceDoc, actor.role);
}

export async function listEvidence(actor, claimId) {
  await loadClaimForActor(claimId, actor);
  const files = await EvidenceFile.find({ claimId }).sort({ receivedAt: -1 }).lean();
  return files.map((f) => serializeEvidenceFile(f, actor.role));
}

export async function getEvidence(actor, claimId, evidenceId) {
  await loadClaimForActor(claimId, actor);
  const file = await EvidenceFile.findOne({ _id: evidenceId, claimId }).lean();
  if (!file) {
    throw new NotFoundError(`Evidence file '${evidenceId}' not found for claim`);
  }
  return serializeEvidenceFile(file, actor.role);
}

export async function getFileStream(actor, claimId, evidenceId) {
  await loadClaimForActor(claimId, actor);
  const file = await EvidenceFile.findOne({ _id: evidenceId, claimId });
  if (!file) {
    throw new NotFoundError(`Evidence file '${evidenceId}' not found for claim`);
  }

  // Verifier read logs internal timeline event
  if (actor.role === 'verifier') {
    await logTimelineEvent({
      claimId,
      kind: 'evidence_viewed',
      summary: `Evidence file '${file.fileName}' inspected by verifier`,
      actor,
      visibility: 'verifier',
      metadata: { evidenceId: file._id, fileName: file.fileName },
    });
  }

  const filePath = resolveStoragePath(file.storageKey);
  return {
    filePath,
    mimeType: file.mimeType,
    fileName: file.fileName,
    sizeBytes: file.sizeBytes,
  };
}

export async function getThumbnail(actor, claimId, evidenceId) {
  await loadClaimForActor(claimId, actor);
  const file = await EvidenceFile.findOne({ _id: evidenceId, claimId });
  if (!file || !file.mimeType.startsWith('image/') || file.fileName.toLowerCase().endsWith('.heic')) {
    throw new NotFoundError('Thumbnail not available for this evidence item');
  }

  try {
    const thumbBuffer = await generateThumbnail(file.storageKey);
    return thumbBuffer;
  } catch (err) {
    logger.warn({ err, evidenceId }, 'Could not generate thumbnail');
    throw new NotFoundError('Thumbnail generation unavailable');
  }
}

export async function reviewEvidence(actor, claimId, evidenceId, body = {}) {
  const status = body.status || body.reviewStatus;
  const note = body.note || body.reviewNote;
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);
  assertWritable(claim);
  await autoAssignAndTransitionVerifierWrite(claim, actor);

  if (!['reviewed', 'needs_replacement'].includes(status)) {
    throw new ValidationError("Review status must be 'reviewed' or 'needs_replacement'", [
      { field: 'status', message: "Invalid status: must be 'reviewed' or 'needs_replacement'" },
    ]);
  }

  const file = await EvidenceFile.findOne({ _id: evidenceId, claimId });
  if (!file) {
    throw new NotFoundError(`Evidence file '${evidenceId}' not found on claim`);
  }

  file.reviewStatus = status;
  file.reviewNote = note || null;
  await file.save();

  // Update linked checklist item
  if (file.checklistItemId) {
    const item = claim.checklist.find((i) => i.id === file.checklistItemId);
    if (item) {
      item.status = status;
      item.statusChangedBy = actor.id;
      item.statusChangedAt = new Date();
      if (note) item.reason = note;
      await claim.save();
    }
  }

  // If needs_replacement, log claimant-visible timeline event WITHOUT the private note text!
  if (status === 'needs_replacement') {
    await logTimelineEvent({
      claimId,
      kind: 'evidence_replacement_requested',
      summary: `A document or photo ('${file.fileName}') requires replacement`,
      actor,
      visibility: 'claimant',
      metadata: { evidenceId: file._id, checklistItemId: file.checklistItemId },
    });
  } else {
    await logTimelineEvent({
      claimId,
      kind: 'evidence_reviewed',
      summary: `Evidence file '${file.fileName}' reviewed by verifier`,
      actor,
      visibility: 'verifier',
      metadata: { evidenceId: file._id },
    });
  }

  return serializeEvidenceFile(file, actor.role);
}

