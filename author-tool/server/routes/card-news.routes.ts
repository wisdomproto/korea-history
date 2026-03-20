import { Router } from 'express';
import archiver from 'archiver';
import { asyncHandler } from '../middleware.js';
import { generateCardNews, getAvailableExams, getExamQuestions } from '../services/card-news.service.js';
import { generateNoteCardNews } from '../services/note-card-news.service.js';
import { TEXT_MODELS } from '../services/gemini.provider.js';

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
  res.json({ success: true, data: TEXT_MODELS });
}));

/** POST /api/card-news/generate — generate card news (SSE progress) */
router.post('/generate', asyncHandler(async (req, res) => {
  const { questions, ctaText, ctaUrl, useAiExplanation, model } = req.body;

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type: string, data: any) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    const results = await generateCardNews(
      { questions, ctaText, ctaUrl, useAiExplanation, model },
      (msg) => sendEvent('progress', { message: msg }),
    );

    // Convert to base64 for SSE transport
    const base64Results = results.map((r) => ({
      examNumber: r.examNumber,
      questionNumber: r.questionNumber,
      slides: r.slides.map((buf) => buf.toString('base64')),
    }));

    sendEvent('complete', { results: base64Results });
  } catch (err: any) {
    sendEvent('error', { message: err.message || '생성 중 오류 발생' });
  }

  res.end();
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

/** POST /api/card-news/notes/generate — generate note card news (SSE progress) */
router.post('/notes/generate', asyncHandler(async (req, res) => {
  const { noteIds, slideCount, model, ctaUrl } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type: string, data: any) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    const results = await generateNoteCardNews(
      { noteIds, slideCount, model, ctaUrl },
      (msg) => sendEvent('progress', { message: msg }),
    );

    const base64Results = results.map((r) => ({
      noteId: r.noteId,
      title: r.title,
      era: r.era,
      slides: r.slides.map((buf) => buf.toString('base64')),
    }));

    sendEvent('complete', { results: base64Results });
  } catch (err: any) {
    sendEvent('error', { message: err.message || '생성 중 오류 발생' });
  }

  res.end();
}));

export default router;
