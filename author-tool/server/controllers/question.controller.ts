import { QuestionService } from '../services/question.service.js';
import { asyncHandler } from '../middleware.js';

export const QuestionController = {
  list: asyncHandler(async (req, res) => {
    const examId = parseInt(req.query.examId as string, 10);
    const questions = await QuestionService.listByExam(examId);
    res.json({ success: true, data: questions });
  }),

  create: asyncHandler(async (req, res) => {
    const { examId, ...questionData } = req.body;
    const question = await QuestionService.create(examId, questionData);
    res.status(201).json({ success: true, data: question });
  }),

  update: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const question = await QuestionService.update(id, req.body);
    res.json({ success: true, data: question });
  }),

  delete: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await QuestionService.delete(id);
    res.json({ success: true, data: null });
  }),

  reorder: asyncHandler(async (req, res) => {
    const { examId, questionIds } = req.body;
    const questions = await QuestionService.reorder(examId, questionIds);
    res.json({ success: true, data: questions });
  }),

  addBatch: asyncHandler(async (req, res) => {
    const { examId, questions } = req.body;
    const added = await QuestionService.addBatch(examId, questions);
    res.status(201).json({ success: true, data: added });
  }),

  bulkAnswers: asyncHandler(async (req, res) => {
    const { examId, answers } = req.body;
    const questions = await QuestionService.bulkUpdateAnswers(examId, answers);
    res.json({ success: true, data: questions });
  }),

  bulkExplanations: asyncHandler(async (req, res) => {
    const { examId, explanations } = req.body;
    const questions = await QuestionService.bulkUpdateExplanations(examId, explanations);
    res.json({ success: true, data: questions });
  }),
};
