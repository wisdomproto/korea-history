import { Router } from 'express';
import { asyncHandler } from '../middleware.js';
import { getAllNotes, getNoteById, updateNote, getNotesStats } from '../services/notes.service.js';

const router = Router();

/** GET /api/notes — list all notes (index only, no content) */
router.get('/', asyncHandler(async (_req, res) => {
  const notes = getAllNotes();
  res.json({ success: true, data: notes });
}));

/** GET /api/notes/stats — notes statistics */
router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = getNotesStats();
  res.json({ success: true, data: stats });
}));

/** GET /api/notes/:id — get single note with full content */
router.get('/:id', asyncHandler(async (req, res) => {
  const note = getNoteById(req.params.id);
  if (!note) {
    res.status(404).json({ success: false, error: '노트를 찾을 수 없습니다.' });
    return;
  }
  res.json({ success: true, data: note });
}));

/** PUT /api/notes/:id — update note */
router.put('/:id', asyncHandler(async (req, res) => {
  const updated = updateNote(req.params.id, req.body);
  res.json({ success: true, data: updated });
}));

export default router;
