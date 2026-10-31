import * as recService from './service.js';

export async function getRecommendation(req, res, next) {
  try {
    const data = await recService.getRecommendation(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function offerRecommendation(req, res, next) {
  try {
    const data = await recService.createRecommendationOffer(req.actor, req.params.id, req.body);
    res.status(201).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function requestRecommendation(req, res, next) {
  try {
    const data = await recService.requestRecommendationAsClaimant(req.actor, req.params.id);
    res.status(201).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

