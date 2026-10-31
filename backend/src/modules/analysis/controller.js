import * as analysisService from './service.js';

export async function runAnalysis(req, res, next) {
  try {
    const result = await analysisService.startAnalysis(req.actor, req.params.id);
    res.status(202).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStatus(req, res, next) {
  try {
    const status = await analysisService.getAnalysisStatus(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

export async function getVersions(req, res, next) {
  try {
    const versions = await analysisService.getAnalysisVersions(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: versions,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAnalysis(req, res, next) {
  try {
    const detail = await analysisService.getAnalysisDetail(
      req.actor,
      req.params.id,
      req.query.version
    );
    res.status(200).json({
      ok: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateFinding(req, res, next) {
  try {
    const result = await analysisService.updateFindingDisposition(
      req.actor,
      req.params.id,
      req.params.fid,
      req.body
    );
    res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function annotateMatrix(req, res, next) {
  try {
    const result = await analysisService.annotateMatrixRow(
      req.actor,
      req.params.id,
      req.body
    );
    res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
