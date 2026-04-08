import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useCreateExam, useDeleteExam } from '@/features/exam/hooks/useExams';
import { useUpdateQuestion, useDeleteQuestion, useCreateQuestion, useAddBatchQuestions } from '@/features/question/hooks/useQuestions';
import { pdfImportApi } from '@/features/exam/api/pdf-import.api';
import type { Question, Exam } from '@/lib/types';

export function useExamActions() {
  const { selectedExamId, editingQuestionId, setEditingQuestionId, setSelectedExamId } = useEditorStore();
  const createExamMutation = useCreateExam();
  const deleteExamMutation = useDeleteExam();
  const createQuestionMutation = useCreateQuestion();
  const updateQuestionMutation = useUpdateQuestion();
  const deleteQuestionMutation = useDeleteQuestion();
  const addBatchMutation = useAddBatchQuestions();

  const [showExamForm, setShowExamForm] = useState(false);
  const [showBulkAnswers, setShowBulkAnswers] = useState(false);
  const [showBulkExplanations, setShowBulkExplanations] = useState(false);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  const handleDeleteExam = () => {
    if (!selectedExamId) return;
    if (!confirm('\uC774 \uC2DC\uD5D8\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uBAA8\uB4E0 \uBB38\uC81C\uAC00 \uD568\uAED8 \uC0AD\uC81C\uB429\uB2C8\uB2E4.')) return;
    deleteExamMutation.mutate(selectedExamId, { onSuccess: () => setSelectedExamId(null) });
  };

  const handleSaveQuestion = (data: Partial<Question>, questionId?: number) => {
    const qId = questionId ?? editingQuestionId;
    if (qId && selectedExamId) {
      updateQuestionMutation.mutate({ id: qId, updates: data, examId: selectedExamId });
    }
  };

  const handleDeleteQuestion = (id: number) => {
    if (!selectedExamId || !confirm('\uC774 \uBB38\uC81C\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
    deleteQuestionMutation.mutate({ id, examId: selectedExamId }, {
      onSuccess: () => { if (editingQuestionId === id) setEditingQuestionId(null); },
    });
  };

  const handleAddQuestion = () => {
    if (!selectedExamId) return;
    createQuestionMutation.mutate({
      examId: selectedExamId,
      question: {
        content: '',
        choices: ['', '', '', '', ''],
        correctAnswer: 1,
        points: 2,
        era: '\uC0BC\uAD6D',
        category: '\uC815\uCE58',
        difficulty: 2,
      },
    }, {
      onSuccess: (q) => setEditingQuestionId(q.id),
    });
  };

  const handleCreateExam = async (exam: Omit<Exam, 'id'>, pdfFile?: File) => {
    createExamMutation.mutate(exam, {
      onSuccess: async (data) => {
        const examId = data.exam.id;
        if (pdfFile) {
          // Parse PDF and add questions
          setPdfImporting(true);
          setPdfProgress('PDF \uC5C5\uB85C\uB4DC \uC911...');
          try {
            const questions = await pdfImportApi.parse(pdfFile, exam.examNumber, undefined, (msg) => setPdfProgress(msg));
            if (questions.length > 0) {
              addBatchMutation.mutate({ examId, questions }, {
                onSuccess: () => {
                  setShowExamForm(false);
                  setPdfImporting(false);
                  setSelectedExamId(examId);
                },
                onError: () => {
                  setPdfImporting(false);
                  setShowExamForm(false);
                  setSelectedExamId(examId);
                  alert('\uC2DC\uD5D8\uC740 \uC0DD\uC131\uB418\uC5C8\uC9C0\uB9CC PDF \uBB38\uC81C \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.');
                },
              });
            } else {
              setPdfImporting(false);
              setShowExamForm(false);
              setSelectedExamId(examId);
              alert('PDF\uC5D0\uC11C \uBB38\uC81C\uB97C \uCD94\uCD9C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC2DC\uD5D8\uC740 \uBE48 \uC0C1\uD0DC\uB85C \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
            }
          } catch (err: any) {
            setPdfImporting(false);
            setShowExamForm(false);
            setSelectedExamId(examId);
            const serverMsg = err?.response?.data?.error;
            const msg = serverMsg || (err instanceof Error ? err.message : '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958');
            alert(`PDF \uD30C\uC2F1 \uC624\uB958: ${msg}`);
          }
        } else {
          setShowExamForm(false);
          setSelectedExamId(examId);
        }
      },
      onError: (err) => {
        alert(`\uC2DC\uD5D8 \uC0DD\uC131 \uC2E4\uD328: ${err.message}`);
      },
    });
  };

  return {
    // Mutations
    deleteExamMutation,
    createQuestionMutation,
    updateQuestionMutation,
    createExamMutation,
    // Handlers
    handleDeleteExam,
    handleSaveQuestion,
    handleDeleteQuestion,
    handleAddQuestion,
    handleCreateExam,
    // Modal state
    showExamForm,
    setShowExamForm,
    showBulkAnswers,
    setShowBulkAnswers,
    showBulkExplanations,
    setShowBulkExplanations,
    // PDF import state
    pdfImporting,
    pdfProgress,
  };
}
