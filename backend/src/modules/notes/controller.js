import * as noteService from './service.js';

export async function getNotes(req, res, next) {
  try {
    const list = await noteService.listPrivateNotes(req.actor, req.params.id);
    res.status(200).json({
      ok: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

export async function addNote(req, res, next) {
  try {
    const note = await noteService.createPrivateNote(req.actor, req.params.id, req.body);
    res.status(201).json({
      ok: true,
      data: note,
    });
  } catch (err) {
    next(err);
  }
}

