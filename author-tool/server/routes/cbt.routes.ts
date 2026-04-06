import { Router } from 'express';
import * as cbtService from '../services/cbt.service.js';

const router = Router();

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
