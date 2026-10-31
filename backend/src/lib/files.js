import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import exifr from 'exifr';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { env } from '../config/env.js';
import { UploadRejectedError } from './errors.js';
import { computeSha256, computeDHash, hammingDistance } from './hash.js';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

export async function validateUploadedFile(file) {
  if (!file || !file.buffer) {
    throw new UploadRejectedError('No file provided for upload', [
      { field: 'file', message: 'File is required' },
    ]);
  }

  // Size limit check
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  if (file.buffer.length > maxBytes) {
    throw new UploadRejectedError(
      `File size exceeds maximum allowed limit of ${env.MAX_UPLOAD_MB}MB`,
      [{ field: 'file', message: `File exceeds ${env.MAX_UPLOAD_MB}MB limit` }]
    );
  }

  const origExt = (path.extname(file.originalname || '').slice(1) || '').toLowerCase();
  const normalizedExt = origExt === 'jpeg' ? 'jpg' : origExt;

  if (!ALLOWED_EXTENSIONS.has(normalizedExt)) {
    throw new UploadRejectedError(
      `Unsupported file extension '.${origExt}'. Allowed: JPG, PNG, WEBP, HEIC, PDF`,
      [{ field: 'file', message: `Extension .${origExt} is not permitted` }]
    );
  }

  // Magic bytes inspection
  const detected = await fileTypeFromBuffer(file.buffer);

  if (!detected) {
    // If HEIC, some buffers might not be recognized by fileTypeFromBuffer if missing ftyp box, but let's check
    if (normalizedExt === 'heic') {
      return { ext: 'heic', mime: 'image/heic' };
    }
    throw new UploadRejectedError('File format signature could not be verified from contents', [
      { field: 'file', message: 'Invalid or corrupted file content' },
    ]);
  }

  const detectedExt = detected.ext === 'jpeg' ? 'jpg' : detected.ext;

  if (!ALLOWED_EXTENSIONS.has(detectedExt) || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new UploadRejectedError(`Detected file type '${detected.mime}' is not permitted`, [
      { field: 'file', message: `MIME type ${detected.mime} is not allowed` },
    ]);
  }

  // Check agreement between declared extension and detected type
  if (detectedExt !== normalizedExt) {
    throw new UploadRejectedError(
      `File extension '.${origExt}' does not match actual detected file format '.${detected.ext}'`,
      [{ field: 'file', message: 'File extension and magic bytes mismatch' }]
    );
  }

  return { ext: detectedExt, mime: detected.mime };
}

export async function saveFileToDisk(buffer, claimId, ext) {
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  const claimDir = path.join(uploadRoot, 'claims', claimId);
  await fs.mkdir(claimDir, { recursive: true });

  const fileName = `${randomUUID()}.${ext}`;
  const absolutePath = path.join(claimDir, fileName);

  // Security check: ensure path does not escape uploadRoot
  if (!absolutePath.startsWith(uploadRoot)) {
    throw new UploadRejectedError('Invalid file storage path traversal attempt');
  }

  await fs.writeFile(absolutePath, buffer);
  const relativeKey = `claims/${claimId}/${fileName}`;
  return { storageKey: relativeKey, absolutePath };
}

export function resolveStoragePath(storageKey) {
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  const fullPath = path.resolve(uploadRoot, storageKey);
  if (!fullPath.startsWith(uploadRoot)) {
    throw new Error('Access outside storage root denied');
  }
  return fullPath;
}

export async function processFileMetadata(buffer, mimeType, ext, claimId, options = {}) {
  const { existingEvidence = [], hasCaptureSession = false } = options;
  const sha256 = computeSha256(buffer);

  let width = null;
  let height = null;
  let pageCount = null;
  let perceptualHash = null;

  const metadata = {
    present: false,
    dateTaken: null,
    cameraMake: null,
    cameraModel: null,
    gpsPresent: false, // Strictly boolean, never coordinates
  };

  // EXIF extraction via exifr
  try {
    const exif = await exifr.parse(buffer, {
      tiff: true,
      xmp: true,
      gps: true,
    });
    if (exif) {
      metadata.present = true;
      if (exif.DateTimeOriginal || exif.CreateDate) {
        const d = new Date(exif.DateTimeOriginal || exif.CreateDate);
        if (!isNaN(d.getTime())) {
          metadata.dateTaken = d.toISOString();
        }
      }
      metadata.cameraMake = exif.Make ? String(exif.Make).trim() : null;
      metadata.cameraModel = exif.Model ? String(exif.Model).trim() : null;
      metadata.gpsPresent = Boolean(
        exif.latitude !== undefined ||
          exif.longitude !== undefined ||
          exif.GPSLatitude !== undefined
      );
    }
  } catch {
    // Non-image or exif parsing failed; metadata stays default
  }

  // Sharp dimensions and dHash
  if (mimeType.startsWith('image/') && ext !== 'heic') {
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width || null;
      height = meta.height || null;
      perceptualHash = await computeDHash(buffer);
    } catch {
      // Graceful fallback if sharp cannot decode
    }
  }

  // PDF page count via pdf-lib
  if (mimeType === 'application/pdf') {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch {
      // PDF parsing fallback
    }
  }

  // Provenance assessment within claim
  const duplicateOfIds = [];
  const similarToIds = [];
  const statuses = [];

  if (hasCaptureSession) {
    statuses.push('capture_workflow_recorded');
  }
  if (metadata.present) {
    statuses.push('metadata_present');
  }

  for (const item of existingEvidence) {
    if (item.sha256 === sha256) {
      duplicateOfIds.push(item._id || item.id);
    } else if (perceptualHash && item.perceptualHash) {
      const dist = hammingDistance(perceptualHash, item.perceptualHash);
      if (dist <= 6) {
        similarToIds.push(item._id || item.id);
      }
    }
  }

  if (duplicateOfIds.length > 0) {
    statuses.push('duplicate_candidate');
  }
  if (similarToIds.length > 0) {
    statuses.push('visually_similar_candidate');
  }
  if (statuses.length === 0) {
    statuses.push('provenance_unresolved');
  }

  return {
    sha256,
    width,
    height,
    pageCount,
    perceptualHash,
    provenance: {
      statuses,
      duplicateOfIds,
      similarToIds,
      metadata,
    },
  };
}

export async function generateThumbnail(storageKey) {
  const fullPath = resolveStoragePath(storageKey);
  const buffer = await fs.readFile(fullPath);
  return sharp(buffer)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

