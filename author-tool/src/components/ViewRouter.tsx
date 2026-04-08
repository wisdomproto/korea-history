import { StatsPanel } from '@/features/dashboard/components/StatsPanel';
import { GeneratorPanel } from '@/features/generator/components/GeneratorPanel';
import { CardNewsPanel } from '@/features/card-news/components/CardNewsPanel';
import { NoteCardNewsPanel } from '@/features/card-news/components/NoteCardNewsPanel';
import { CardNewsGallery } from '@/features/card-news/components/CardNewsGallery';
import { NotesPanel } from '@/features/notes/components/NotesPanel';
import { ContentPanel } from '@/features/content/components/ContentPanel';
import { NoteEditorPanel } from '@/features/notes/components/NoteEditorPanel';
import { CbtExamPanel } from '@/features/cbt-import/components/CbtExamPanel';
import { SummaryNoteViewer } from '@/features/summary-notes/components/SummaryNoteViewer';
import AnalyticsDashboard from '@/features/analytics/components/AnalyticsDashboard';
import { QuestionList } from '@/features/question/components/QuestionList';
import { QuestionEditor } from '@/features/question/components/QuestionEditor';
import { Button } from './Button';
import type { Question } from '@/lib/types';
import type { ActiveView } from '@/store/editor.store';

interface ExamFile {
  exam: { examNumber: number; examDate: string };
  questions: Question[];
}

interface ViewRouterProps {
  activeView: string;
  currentProject: { icon?: string; name?: string } | undefined;
  selectedExamId: number | null;
  examLoading: boolean;
  examFile: ExamFile | undefined;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;
  setActiveView: (view: ActiveView) => void;
  handleDeleteExam: () => void;
  handleAddQuestion: () => void;
  handleSaveQuestion: (data: Partial<Question>, questionId?: number) => void;
  handleDeleteQuestion: (id: number) => void;
  refetchExam: () => void;
  createQuestionPending: boolean;
  updateQuestionPending: boolean;
  setShowBulkAnswers: (show: boolean) => void;
  setShowBulkExplanations: (show: boolean) => void;
}

export function ViewRouter({
  activeView,
  currentProject,
  selectedExamId,
  examLoading,
  examFile,
  editingQuestionId,
  setEditingQuestionId,
  setActiveView,
  handleDeleteExam,
  handleAddQuestion,
  handleSaveQuestion,
  handleDeleteQuestion,
  refetchExam,
  createQuestionPending,
  updateQuestionPending,
  setShowBulkAnswers,
  setShowBulkExplanations,
}: ViewRouterProps) {
  const selectedQuestion = examFile?.questions.find((q) => q.id === editingQuestionId) ?? null;
  const isExamView = (activeView === 'exam' || activeView === 'question') && examFile;

  return (
    <>
      {/* Analytics Dashboard */}
      {activeView === 'analytics' && (
        <AnalyticsDashboard />
      )}

      {/* Dashboard */}
      {activeView === 'dashboard' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-xl font-bold">{currentProject?.icon} {currentProject?.name || '\uD504\uB85C\uC81D\uD2B8'} \uB300\uC2DC\uBCF4\uB4DC</h2>
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

      {/* Card News Gallery */}
      {activeView === 'card-news-gallery' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl">
            <CardNewsGallery />
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

      {/* Content */}
      {activeView === 'content' && (
        <ContentPanel />
      )}

      {/* Notes Editor */}
      {activeView === 'notes-editor' && (
        <NoteEditorPanel />
      )}

      {/* CBT Exam View */}
      {activeView === 'cbt-exam' && (
        <CbtExamPanel />
      )}

      {/* Summary Notes Viewer */}
      {activeView === 'summary-notes-editor' && (
        <SummaryNoteViewer />
      )}

      {/* Exam loading */}
      {selectedExamId && examLoading && (activeView === 'exam' || activeView === 'question') && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
            <p className="text-gray-500">{'\uBB38\uC81C \uB85C\uB529 \uC911...'}</p>
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
                  <h2 className="font-bold">{'\uC81C'}{examFile.exam.examNumber}{'\uD68C'}</h2>
                  <p className="text-xs text-gray-500">
                    {examFile.exam.examDate} {'\xB7'} {examFile.questions.length}{'\uBB38\uC81C'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setShowBulkAnswers(true)}>{'\uC815\uB2F5'}</Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowBulkExplanations(true)}>{'\uD574\uC124'}</Button>
                  <Button size="sm" onClick={handleAddQuestion} loading={createQuestionPending}>+</Button>
                  <Button size="sm" variant="danger" onClick={handleDeleteExam}>{'\uC0AD\uC81C'}</Button>
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
                saving={updateQuestionPending}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">{'\uD83D\uDCDD'}</div>
                  <p>{'\uC67C\uCABD\uC5D0\uC11C \uBB38\uC81C\uB97C \uC120\uD0DD\uD558\uAC70\uB098'}</p>
                  <p className="mt-1">{'+ \uBC84\uD2BC\uC73C\uB85C \uC0C8 \uBB38\uC81C\uB97C \uCD94\uAC00\uD558\uC138\uC694'}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
