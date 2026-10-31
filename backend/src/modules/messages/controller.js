import * as messageService from './service.js';

export async function getMessages(req, res, next) {
  try {
    const list = await messageService.listMessages(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const message = await messageService.postMessage(req.actor, req.params.id, req.body);
    res.status(201).json({
      ok: true,
      data: message,
    });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    await messageService.markMessagesAsRead(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: { read: true },
    });
  } catch (err) {
    next(err);
  }
}

