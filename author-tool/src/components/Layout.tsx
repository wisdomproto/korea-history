import { useEditorStore } from '@/store/editor.store';
import { useExams, useExam } from '@/features/exam/hooks/useExams';
import { ExamForm } from '@/features/exam/components/ExamForm';
import { BulkAnswerModal } from '@/features/question/components/BulkAnswerModal';
import { BulkExplanationModal } from '@/features/question/components/BulkExplanationModal';
import { Sidebar } from './Sidebar';
import { ViewRouter } from './ViewRouter';
import { ReminderBanner } from './ReminderBanner';
import { useExamActions } from '@/hooks/useExamActions';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/axios';

export function Layout() {
  const { selectedExamId, selectedProjectId, activeView, editingQuestionId, setEditingQuestionId, setActiveView, setSelectedExamId } = useEditorStore();
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiGet<any[]>('/projects') });
  const currentProject = projects?.find((p: any) => p.id === selectedProjectId);
  const { data: allExams } = useExams();
  const { data: examFile, isLoading: examLoading, refetch: refetchExam } = useExam(selectedExamId);

  const {
    deleteExamMutation,
    createQuestionMutation,
    updateQuestionMutation,
    createExamMutation,
    handleDeleteExam,
    handleSaveQuestion,
    handleDeleteQuestion,
    handleAddQuestion,
    handleCreateExam,
    showExamForm,
    setShowExamForm,
    showBulkAnswers,
    setShowBulkAnswers,
    showBulkExplanations,
    setShowBulkExplanations,
    pdfImporting,
    pdfProgress,
  } = useExamActions();

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

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-3 shrink-0">
          <ReminderBanner />
        </div>
        <div className="flex-1 flex overflow-hidden">
        <ViewRouter
          activeView={activeView}
          currentProject={currentProject}
          selectedExamId={selectedExamId}
          examLoading={examLoading}
          examFile={examFile}
          editingQuestionId={editingQuestionId}
          setEditingQuestionId={setEditingQuestionId}
          setActiveView={setActiveView}
          handleDeleteExam={handleDeleteExam}
          handleAddQuestion={handleAddQuestion}
          handleSaveQuestion={handleSaveQuestion}
          handleDeleteQuestion={handleDeleteQuestion}
          refetchExam={refetchExam}
          createQuestionPending={createQuestionMutation.isPending}
          updateQuestionPending={updateQuestionMutation.isPending}
          setShowBulkAnswers={setShowBulkAnswers}
          setShowBulkExplanations={setShowBulkExplanations}
        />
        </div>
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
