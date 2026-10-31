import * as requestService from './service.js';

export async function listRequests(req, res, next) {
  try {
    const list = await requestService.listRequests(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRequest(req, res, next) {
  try {
    const data = await requestService.getRequest(req.actor, req.params.id, req.params.rid);
    res.status(200).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req, res, next) {
  try {
    const data = await requestService.createRequest(req.actor, req.params.id, req.body);
    res.status(201).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function patchRequest(req, res, next) {
  try {
    const data = await requestService.patchRequest(
      req.actor,
      req.params.id,
      req.params.rid,
      req.body
    );
    res.status(200).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitResponse(req, res, next) {
  try {
    const data = await requestService.submitClaimantResponse(
      req.actor,
      req.params.id,
      req.params.rid,
      req.body
    );
    res.status(201).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

