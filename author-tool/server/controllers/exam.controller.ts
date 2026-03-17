import { ExamService } from '../services/exam.service.js';
import { asyncHandler } from '../middleware.js';
import { config } from '../config.js';

export const ExamController = {
  list: asyncHandler(async (_req, res) => {
    const exams = await ExamService.list();
    res.json({ success: true, data: exams });
  }),

  getById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const examFile = await ExamService.getById(id);
    res.json({ success: true, data: examFile });
  }),

  create: asyncHandler(async (req, res) => {
    const examFile = await ExamService.create(req.body);
    res.status(201).json({ success: true, data: examFile });
  }),

  update: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const examFile = await ExamService.update(id, req.body);
    res.json({ success: true, data: examFile });
  }),

  delete: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await ExamService.delete(id);
    res.json({ success: true, data: null });
  }),

  reorder: asyncHandler(async (req, res) => {
    const { examIds } = req.body as { examIds: number[] };
    await ExamService.reorder(examIds);
    res.json({ success: true, data: null });
  }),

  sync: asyncHandler(async (_req, res) => {
    const count = await ExamService.syncToLocal();
    res.json({ success: true, data: { synced: count } });
  }),

  deploy: asyncHandler(async (_req, res) => {
    const hookUrl = config.vercel.deployHookUrl;
    if (!hookUrl) {
      res.status(400).json({ success: false, error: 'VERCEL_DEPLOY_HOOK_URL is not configured' });
      return;
    }
    const response = await fetch(hookUrl, { method: 'POST' });
    if (!response.ok) {
      res.status(502).json({ success: false, error: `Vercel deploy hook failed: ${response.status}` });
      return;
    }
    const data = await response.json();
    res.json({ success: true, data: { message: 'Deploy triggered', vercel: data } });
  }),
};
