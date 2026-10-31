import * as dashboardService from './service.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await dashboardService.getDashboardData(req.actor);
    res.status(200).json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

