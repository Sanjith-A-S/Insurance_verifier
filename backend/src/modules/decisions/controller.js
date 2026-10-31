import * as decisionService from './service.js';

export async function getDecisions(req, res, next) {
  try {
    const list = await decisionService.listDecisions(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

export async function createDecision(req, res, next) {
  try {
    const result = await decisionService.recordDecision(req.actor, req.params.id, req.body);
    res.status(201).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

