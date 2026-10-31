import fs from 'node:fs';
import * as evidenceService from './service.js';

export async function createCaptureSession(req, res, next) {
  try {
    const session = await evidenceService.createCaptureSession(req.actor, req.params.id);
    res.status(201).json({
      ok: true,
      data: session,
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadEvidence(req, res, next) {
  try {
    const evidence = await evidenceService.uploadEvidence(
      req.actor,
      req.params.id,
      req.file,
      req.body
    );
    res.status(201).json({
      ok: true,
      data: evidence,
    });
  } catch (err) {
    next(err);
  }
}

export async function listEvidence(req, res, next) {
  try {
    const list = await evidenceService.listEvidence(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

export async function getEvidence(req, res, next) {
  try {
    const file = await evidenceService.getEvidence(req.actor, req.params.id, req.params.eid);
    res.status(200).json({
      ok: true,
      data: file,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFile(req, res, next) {
  try {
    const fileInfo = await evidenceService.getFileStream(req.actor, req.params.id, req.params.eid);

    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`
    );

    const stream = fs.createReadStream(fileInfo.filePath);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function getThumbnail(req, res, next) {
  try {
    const thumbBuffer = await evidenceService.getThumbnail(req.actor, req.params.id, req.params.eid);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).send(thumbBuffer);
  } catch (err) {
    next(err);
  }
}

export async function reviewEvidence(req, res, next) {
  try {
    const reviewed = await evidenceService.reviewEvidence(
      req.actor,
      req.params.id,
      req.params.eid,
      req.body
    );
    res.status(200).json({
      ok: true,
      data: reviewed,
    });
  } catch (err) {
    next(err);
  }
}

