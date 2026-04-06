import { Router } from 'express';
import * as summaryNoteService from '../services/summary-note.service.js';
import * as generator from '../services/summary-note-generator.service.js';

const router = Router();

// POST /api/summary-notes/generate — SSE stream
router.post('/generate', async (req, res, next) => {
  try {
    const { categoryCode, examIds, mode, model } = req.body;
    if (!categoryCode) return res.status(400).json({ success: false, error: 'categoryCode required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const gen = generator.generate({
      categoryCode,
      examIds: examIds ?? [],
      mode: mode ?? 'quick',
      model,
    });

    for await (const event of gen) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (err) { next(err); }
});

// GET /api/summary-notes/:categoryCode
router.get('/:categoryCode', async (req, res, next) => {
  try {
    const notes = await summaryNoteService.listNotes(req.params.categoryCode);
    res.json({ success: true, data: notes });
  } catch (err) { next(err); }
});

// GET /api/summary-notes/:categoryCode/:noteId
router.get('/:categoryCode/:noteId', async (req, res, next) => {
  try {
    const note = await summaryNoteService.getNote(req.params.categoryCode, req.params.noteId);
    res.json({ success: true, data: note });
  } catch (err) { next(err); }
});

// PUT /api/summary-notes/:categoryCode/:noteId
router.put('/:categoryCode/:noteId', async (req, res, next) => {
  try {
    const existing = await summaryNoteService.getNote(req.params.categoryCode, req.params.noteId);
    const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    await summaryNoteService.saveNote(updated);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
