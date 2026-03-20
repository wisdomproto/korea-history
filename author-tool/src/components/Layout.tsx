import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useEditorStore } from '@/store/editor.store';
import { useExams, useExam, useCreateExam, useDeleteExam } from '@/features/exam/hooks/useExams';
import { useUpdateQuestion, useDeleteQuestion, useCreateQuestion, useAddBatchQuestions } from '@/features/question/hooks/useQuestions';
import { StatsPanel } from '@/features/dashboard/components/StatsPanel';
import { ExamForm } from '@/features/exam/components/ExamForm';
import { QuestionList } from '@/features/question/components/QuestionList';
import { QuestionEditor } from '@/features/question/components/QuestionEditor';
import { GeneratorPanel } from '@/features/generator/components/GeneratorPanel';
import { CardNewsPanel } from '@/features/card-news/components/CardNewsPanel';
import { NoteCardNewsPanel } from '@/features/card-news/components/NoteCardNewsPanel';
import { NotesPanel } from '@/features/notes/components/NotesPanel';
import { pdfImportApi } from '@/features/exam/api/pdf-import.api';
import { Button } from './Button';
import { BulkAnswerModal } from '@/features/question/components/BulkAnswerModal';
import { BulkExplanationModal } from '@/features/question/components/BulkExplanationModal';
import type { Question, Exam } from '@/lib/types';

export function Layout() {
  const { selectedExamId, activeView, editingQuestionId, setEditingQuestionId, setActiveView, setSelectedExamId } = useEditorStore();
  const { data: allExams } = useExams();
  const { data: examFile, isLoading: examLoading, refetch: refetchExam } = useExam(selectedExamId);
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

  const selectedQuestion = examFile?.questions.find((q) => q.id === editingQuestionId) ?? null;

  const handleDeleteExam = () => {
    if (!selectedExamId) return;
    if (!confirm('이 시험을 삭제하시겠습니까? 모든 문제가 함께 삭제됩니다.')) return;
    deleteExamMutation.mutate(selectedExamId, { onSuccess: () => setSelectedExamId(null) });
  };

  const handleSaveQuestion = (data: Partial<Question>, questionId?: number) => {
    const qId = questionId ?? editingQuestionId;
    if (qId && selectedExamId) {
      updateQuestionMutation.mutate({ id: qId, updates: data, examId: selectedExamId });
    }
  };

  const handleDeleteQuestion = (id: number) => {
    if (!selectedExamId || !confirm('이 문제를 삭제하시겠습니까?')) return;
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
        era: '삼국',
        category: '정치',
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
          setPdfProgress('PDF 업로드 중...');
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
                  alert('시험은 생성되었지만 PDF 문제 저장 중 오류가 발생했습니다.');
                },
              });
            } else {
              setPdfImporting(false);
              setShowExamForm(false);
              setSelectedExamId(examId);
              alert('PDF에서 문제를 추출하지 못했습니다. 시험은 빈 상태로 생성되었습니다.');
            }
          } catch (err: any) {
            setPdfImporting(false);
            setShowExamForm(false);
            setSelectedExamId(examId);
            const serverMsg = err?.response?.data?.error;
            const msg = serverMsg || (err instanceof Error ? err.message : '알 수 없는 오류');
            alert(`PDF 파싱 오류: ${msg}`);
          }
        } else {
          setShowExamForm(false);
          setSelectedExamId(examId);
        }
      },
      onError: (err) => {
        alert(`시험 생성 실패: ${err.message}`);
      },
    });
  };

  const isExamView = (activeView === 'exam' || activeView === 'question') && examFile;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        onCreateExam={() => setShowExamForm(true)}
        onDeleteExam={(id) => {
          deleteExamMutation.mutate(id, {
            onSuccess: () => {
              if (selectedExamId === id) { setSelectedExamId(null); setActiveView('dashboard'); }
            },
          });
        }}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Dashboard */}
        {activeView === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-6 text-xl font-bold">대시보드</h2>
              <StatsPanel />
            </div>
          </div>
        )}

        {/* AI Generator */}
        {activeView === 'generator' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl">
              <GeneratorPanel />
            </div>
          </div>
        )}

        {/* Card News */}
        {activeView === 'card-news' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl">
              <CardNewsPanel />
            </div>
          </div>
        )}

        {/* Note Card News */}
        {activeView === 'note-card-news' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl">
              <NoteCardNewsPanel />
            </div>
          </div>
        )}

        {/* Notes */}
        {activeView === 'notes' && (
          <NotesPanel />
        )}

        {/* Exam loading */}
        {selectedExamId && examLoading && (activeView === 'exam' || activeView === 'question') && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
              <p className="text-gray-500">문제 로딩 중...</p>
            </div>
          </div>
        )}

        {/* Exam View: List (left) + Detail (right) */}
        {isExamView && (
          <>
            {/* Left: Question List */}
            <div className="w-80 flex flex-col border-r bg-white shrink-0">
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">제{examFile.exam.examNumber}회</h2>
                    <p className="text-xs text-gray-500">
                      {examFile.exam.examDate} · {examFile.questions.length}문제
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setShowBulkAnswers(true)}>정답</Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowBulkExplanations(true)}>해설</Button>
                    <Button size="sm" onClick={handleAddQuestion} loading={createQuestionMutation.isPending}>+</Button>
                    <Button size="sm" variant="danger" onClick={handleDeleteExam}>삭제</Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <QuestionList
                  questions={examFile.questions}
                  selectedId={editingQuestionId}
                  examId={selectedExamId!}
                  onSelect={(id) => { setEditingQuestionId(id); setActiveView('question'); }}
                  onDelete={handleDeleteQuestion}
                  onReorder={() => refetchExam()}
                />
              </div>
            </div>

            {/* Right: Question Editor */}
            <div className="flex-1 overflow-y-auto">
              {selectedQuestion ? (
                <QuestionEditor
                  key={selectedQuestion.id}
                  question={selectedQuestion}
                  examId={selectedExamId!}
                  onSave={handleSaveQuestion}
                  saving={updateQuestionMutation.isPending}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📝</div>
                    <p>왼쪽에서 문제를 선택하거나</p>
                    <p className="mt-1">+ 버튼으로 새 문제를 추가하세요</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showExamForm && (
        <ExamForm
          open={showExamForm}
          onClose={() => setShowExamForm(false)}
          onSubmit={handleCreateExam}
          loading={createExamMutation.isPending || pdfImporting}
          existingExamNumbers={allExams?.map((e) => e.examNumber) ?? []}
        />
      )}

      {/* Bulk Answer Modal */}
      {showBulkAnswers && examFile && selectedExamId && (
        <BulkAnswerModal
          open={showBulkAnswers}
          onClose={() => setShowBulkAnswers(false)}
          examId={selectedExamId}
          questionCount={examFile.questions.length}
        />
      )}

      {/* Bulk Explanation Modal */}
      {showBulkExplanations && examFile && selectedExamId && (
        <BulkExplanationModal
          open={showBulkExplanations}
          onClose={() => setShowBulkExplanations(false)}
          examId={selectedExamId}
          questionCount={examFile.questions.length}
        />
      )}

      {/* PDF Import Loading Overlay */}
      {pdfImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-xl bg-white p-8 text-center shadow-2xl min-w-[320px]">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="font-semibold">PDF 분석 중...</p>
            <p className="mt-2 text-sm text-gray-600 max-w-xs truncate">{pdfProgress}</p>
          </div>
        </div>
      )}
    </div>
  );
}
