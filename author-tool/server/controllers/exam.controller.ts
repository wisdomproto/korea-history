import { ExamService } from '../services/exam.service.js';
import { asyncHandler } from '../middleware.js';

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
};
