import * as timelineService from './service.js';

export async function getTimeline(req, res, next) {
  try {
    const list = await timelineService.listTimelineEvents(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

