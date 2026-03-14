import { ExamService } from './exam.service.js';
import type { Question } from './exam.service.js';
import { AppError } from '../middleware.js';

export const QuestionService = {
  async listByExam(examId: number): Promise<Question[]> {
    const examFile = await ExamService.getById(examId);
    return examFile.questions;
  },

  async getById(questionId: number): Promise<{ question: Question; examId: number }> {
    const exams = await ExamService.list();
    for (const exam of exams) {
      const examFile = await ExamService.getById(exam.id);
      const question = examFile.questions.find((q) => q.id === questionId);
      if (question) return { question, examId: exam.id };
    }
    throw new AppError(404, `문제 ID ${questionId}을 찾을 수 없습니다.`);
  },

  async create(examId: number, question: Omit<Question, 'id' | 'examId' | 'questionNumber'>): Promise<Question> {
    const examFile = await ExamService.getById(examId);
    const maxId =
      examFile.questions.length > 0 ? Math.max(...examFile.questions.map((q) => q.id)) : examFile.exam.examNumber * 1000;
    const questionNumber = examFile.questions.length + 1;

    const newQuestion: Question = {
      ...question,
      id: maxId + 1,
      examId: examFile.exam.id,
      questionNumber,
    };

    examFile.questions.push(newQuestion);
    examFile.exam.totalQuestions = examFile.questions.length;
    await ExamService.save(examId, examFile);
    return newQuestion;
  },

  async update(questionId: number, updates: Partial<Omit<Question, 'id' | 'examId'>>): Promise<Question> {
    const exams = await ExamService.list();
    for (const exam of exams) {
      const examFile = await ExamService.getById(exam.id);
      const idx = examFile.questions.findIndex((q) => q.id === questionId);
      if (idx !== -1) {
        const merged = { ...examFile.questions[idx], ...updates };
        // Clean up: remove choiceImages if all null/empty
        if (merged.choiceImages && !merged.choiceImages.some((ci: string | null) => ci)) {
          delete merged.choiceImages;
        }
        examFile.questions[idx] = merged;
        await ExamService.save(exam.id, examFile);
        return examFile.questions[idx];
      }
    }
    throw new AppError(404, `문제 ID ${questionId}을 찾을 수 없습니다.`);
  },

  async delete(questionId: number): Promise<void> {
    const exams = await ExamService.list();
    for (const exam of exams) {
      const examFile = await ExamService.getById(exam.id);
      const idx = examFile.questions.findIndex((q) => q.id === questionId);
      if (idx !== -1) {
        examFile.questions.splice(idx, 1);
        examFile.questions.forEach((q, i) => (q.questionNumber = i + 1));
        examFile.exam.totalQuestions = examFile.questions.length;
        await ExamService.save(exam.id, examFile);
        return;
      }
    }
    throw new AppError(404, `문제 ID ${questionId}을 찾을 수 없습니다.`);
  },

  async reorder(examId: number, questionIds: number[]): Promise<Question[]> {
    const examFile = await ExamService.getById(examId);
    const reordered: Question[] = [];

    for (const id of questionIds) {
      const q = examFile.questions.find((q) => q.id === id);
      if (!q) throw new AppError(400, `문제 ID ${id}이 해당 시험에 없습니다.`);
      reordered.push(q);
    }

    reordered.forEach((q, i) => (q.questionNumber = i + 1));
    examFile.questions = reordered;
    await ExamService.save(examId, examFile);
    return reordered;
  },

  async bulkUpdateAnswers(
    examId: number,
    answers: { questionNumber: number; correctAnswer: number; points?: number }[],
  ): Promise<Question[]> {
    const examFile = await ExamService.getById(examId);
    for (const { questionNumber, correctAnswer, points } of answers) {
      const q = examFile.questions.find((q) => q.questionNumber === questionNumber);
      if (q) {
        q.correctAnswer = correctAnswer;
        if (points !== undefined) q.points = points;
      }
    }
    await ExamService.save(examId, examFile);
    return examFile.questions;
  },

  async bulkUpdateExplanations(
    examId: number,
    explanations: { questionNumber: number; explanation: string }[],
  ): Promise<Question[]> {
    const examFile = await ExamService.getById(examId);
    for (const { questionNumber, explanation } of explanations) {
      const q = examFile.questions.find((q) => q.questionNumber === questionNumber);
      if (q) q.explanation = explanation;
    }
    await ExamService.save(examId, examFile);
    return examFile.questions;
  },

  async addBatch(examId: number, questions: Omit<Question, 'id' | 'examId' | 'questionNumber'>[]): Promise<Question[]> {
    const examFile = await ExamService.getById(examId);
    const maxId =
      examFile.questions.length > 0 ? Math.max(...examFile.questions.map((q) => q.id)) : examFile.exam.examNumber * 1000;

    const added: Question[] = questions.map((q, i) => ({
      ...q,
      id: maxId + 1 + i,
      examId: examFile.exam.id,
      questionNumber: examFile.questions.length + 1 + i,
    }));

    examFile.questions.push(...added);
    examFile.exam.totalQuestions = examFile.questions.length;
    await ExamService.save(examId, examFile);
    return added;
  },
};
