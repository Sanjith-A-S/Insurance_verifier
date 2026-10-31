import * as settlementService from './service.js';

export async function recalculate(req, res, next) {
  try {
    const settlement = await settlementService.recalculateSettlement(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: settlement,
    });
  } catch (err) {
    next(err);
  }
}

export async function override(req, res, next) {
  try {
    const settlement = await settlementService.createSettlementOverride(
      req.actor,
      req.params.id,
      req.body
    );
    res.status(200).json({
      ok: true,
      data: settlement,
    });
  } catch (err) {
    next(err);
  }
}

