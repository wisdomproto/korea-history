import { Router } from 'express';
import * as cbtService from '../services/cbt.service.js';
import { getObjectText, putObject } from '../services/r2.service.js';

const CBT_PREFIX = 'cbt';
const router = Router();

// PUT /api/cbt/categories/:code/exams/:examId/questions/:questionId
router.put('/categories/:code/exams/:examId/questions/:questionId', async (req, res, next) => {
  try {
    const { code, examId, questionId } = req.params;
    const updates = req.body;

    // Read exam from R2
    const key = `${CBT_PREFIX}/${code}/exams/${examId}.json`;
    const raw = await getObjectText(key);
    const exam = JSON.parse(raw);

    // Find and update question
    const qIdx = exam.questions.findIndex((q: any) => q.question_id === questionId);
    if (qIdx < 0) return res.status(404).json({ success: false, error: 'Question not found' });

    const q = exam.questions[qIdx];
    if (updates.text !== undefined) q.text = updates.text;
    if (updates.correct_answer !== undefined) {
      q.correct_answer = updates.correct_answer;
      q.choices.forEach((c: any) => { c.is_correct = c.number === updates.correct_answer; });
    }
    if (updates.choices !== undefined) {
      updates.choices.forEach((text: string, i: number) => {
        if (q.choices[i]) q.choices[i].text = text;
      });
    }
    if (updates.explanation !== undefined) q.explanation = updates.explanation;

    // Save back to R2
    await putObject(key, JSON.stringify(exam, null, 2));

    // Invalidate cache
    cbtService.clearCache(`exam:${code}:${examId}`);

    res.json({ success: true, data: q });
  } catch (err) { next(err); }
});

router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await cbtService.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

router.get('/categories/:code/exams', async (req, res, next) => {
  try {
    const manifest = await cbtService.getManifest(req.params.code);
    res.json({ success: true, data: manifest.exams });
  } catch (err) { next(err); }
});

router.get('/categories/:code/exams/:examId', async (req, res, next) => {
  try {
    const exam = await cbtService.getExam(req.params.code, req.params.examId);
    res.json({ success: true, data: exam });
  } catch (err) { next(err); }
});

export default router;
