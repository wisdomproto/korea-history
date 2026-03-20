import { Router } from 'express';
import archiver from 'archiver';
import { asyncHandler } from '../middleware.js';
import { generateCardNews, getAvailableExams, getExamQuestions } from '../services/card-news.service.js';
import { generateNoteCardNews, IMAGE_MODELS } from '../services/note-card-news.service.js';
import { TEXT_MODELS } from '../services/gemini.provider.js';
import { saveCardNews, getAllCardNews, deleteCardNews } from '../services/card-news-storage.service.js';

const router = Router();

/** GET /api/card-news/exams — list available exams */
router.get('/exams', asyncHandler(async (_req, res) => {
  const exams = getAvailableExams();
  res.json({ success: true, data: exams });
}));

/** GET /api/card-news/questions/:examNumber — get questions for an exam */
router.get('/questions/:examNumber', asyncHandler(async (req, res) => {
  const examNumber = Number(req.params.examNumber);
  const questions = getExamQuestions(examNumber);
  res.json({ success: true, data: questions });
}));

/** GET /api/card-news/models — available AI models */
router.get('/models', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { text: TEXT_MODELS, image: IMAGE_MODELS } });
}));

/** POST /api/card-news/generate — generate card news (JSON response) */
router.post('/generate', asyncHandler(async (req, res) => {
  console.log('[CardNews] Generate request:', req.body.questions?.length, 'questions, bgImage:', !!req.body.bgImageBase64);
  const { questions, ctaText, ctaUrl, model, bgImageBase64 } = req.body;

  const results = await generateCardNews(
    { questions, ctaText, ctaUrl, model, bgImageBase64 },
    (msg) => console.log('[CardNews]', msg),
  );

  console.log('[CardNews] Done! Generated', results.length, 'sets, saving to R2...');

  const saved = [];
  for (const r of results) {
    const item = await saveCardNews({
      type: 'exam',
      title: `제${r.examNumber}회 ${r.questionNumber}번`,
      sourceId: `${r.examNumber}-${r.questionNumber}`,
      slides: r.slides,
    });
    saved.push({ ...item, examNumber: r.examNumber, questionNumber: r.questionNumber });
  }

  console.log('[CardNews] Saved', saved.length, 'items to R2');
  res.json({ success: true, data: saved });
}));

/** POST /api/card-news/download — download ZIP of generated PNGs */
router.post('/download', asyncHandler(async (req, res) => {
  const { questions, ctaText, ctaUrl, useAiExplanation, model } = req.body;

  const results = await generateCardNews(
    { questions, ctaText, ctaUrl, useAiExplanation, model },
  );

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=card-news.zip');

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);

  const slideNames = ['hook', 'question', 'answer', 'cta'];
  for (const result of results) {
    for (let i = 0; i < result.slides.length; i++) {
      archive.append(result.slides[i], {
        name: `exam${result.examNumber}-Q${result.questionNumber}-${slideNames[i]}.png`,
      });
    }
  }

  await archive.finalize();
}));

/** POST /api/card-news/notes/generate — generate note card news (JSON response) */
router.post('/notes/generate', asyncHandler(async (req, res) => {
  console.log('[NoteCardNews] Generate request:', req.body.noteIds?.length, 'notes');
  const { noteIds, slideCount, model, imageModel, ctaUrl } = req.body;

  const results = await generateNoteCardNews(
    { noteIds, slideCount, model, imageModel, ctaUrl },
    (msg) => console.log('[NoteCardNews]', msg),
  );

  console.log('[NoteCardNews] Done! Generated', results.length, 'sets, saving to R2...');

  const saved = [];
  for (const r of results) {
    const item = await saveCardNews({
      type: 'note',
      title: r.title,
      era: r.era,
      sourceId: r.noteId,
      slides: r.slides,
    });
    saved.push(item);
  }

  console.log('[NoteCardNews] Saved', saved.length, 'items to R2');
  res.json({ success: true, data: saved });
}));

/** GET /api/card-news/saved — list all saved card news */
router.get('/saved', asyncHandler(async (_req, res) => {
  const items = getAllCardNews();
  res.json({ success: true, data: items });
}));

/** DELETE /api/card-news/saved/:id — delete a saved card news */
router.delete('/saved/:id', asyncHandler(async (req, res) => {
  await deleteCardNews(req.params.id);
  res.json({ success: true });
}));

export default router;
