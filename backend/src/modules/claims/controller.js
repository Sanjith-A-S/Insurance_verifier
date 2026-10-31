import * as claimService from './service.js';

export async function listClaims(req, res, next) {
  try {
    const result = await claimService.listClaims(req.actor, req.query);
    res.status(200).json({
      ok: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function createDraft(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    const claim = await claimService.createDraftClaim(req.actor, req.body, idempotencyKey);
    res.status(201).json({
      ok: true,
      data: claim,
    });
  } catch (err) {
    next(err);
  }
}

export async function getClaim(req, res, next) {
  try {
    const claim = await claimService.getClaim(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: claim,
    });
  } catch (err) {
    next(err);
  }
}

export async function patchDraft(req, res, next) {
  try {
    const claim = await claimService.updateDraftClaim(req.actor, req.params.id, req.body);
    res.status(200).json({
      ok: true,
      data: claim,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitClaim(req, res, next) {
  try {
    const claim = await claimService.submitClaim(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: claim,
    });
  } catch (err) {
    next(err);
  }
}

export async function assignClaim(req, res, next) {
  try {
    const claim = await claimService.assignClaim(req.actor, req.params.id, req.body.assigneeId);
    res.status(200).json({
      ok: true,
      data: claim,
    });
  } catch (err) {
    next(err);
  }
}

export async function patchStatus(req, res, next) {
  try {
    const claim = await claimService.updateClaimStatus(req.actor, req.params.id, req.body.status);
    res.status(200).json({
      ok: true,
      data: claim,
    });
  } catch (err) {
    next(err);
  }
}

export async function getChecklist(req, res, next) {
  try {
    const checklist = await claimService.getChecklist(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: checklist,
    });
  } catch (err) {
    next(err);
  }
}

export async function patchChecklistItem(req, res, next) {
  try {
    const item = await claimService.updateChecklistItem(
      req.actor,
      req.params.id,
      req.params.itemId,
      req.body
    );
    res.status(200).json({
      ok: true,
      data: item,
    });
  } catch (err) {
    next(err);
  }
}
