// author-tool/src/features/content/components/NewContentDialog.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../lib/axios';
import { useCreateContent } from '../hooks/useContent';
import { useEditorStore } from '../../../store/editor.store';

interface Props {
  open: boolean;
  onClose: () => void;
}

type SourceType = 'exam' | 'note' | 'free';

export function NewContentDialog({ open, onClose }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>('exam');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState('');
  const [title, setTitle] = useState('');

  const setSelectedContentId = useEditorStore((s) => s.setSelectedContentId);
  const createContent = useCreateContent();

  // Fetch exams
  const { data: exams } = useQuery({
    queryKey: ['card-news-exams'],
    queryFn: () =>
      apiGet<{ examNumber: number; name: string; questionCount: number }[]>('/card-news/exams'),
    enabled: open && sourceType === 'exam',
  });

  // Fetch questions for selected exam
  const { data: questions } = useQuery({
    queryKey: ['card-news-questions', selectedExam],
    queryFn: () =>
      apiGet<{ questionNumber: number; content: string; era: string }[]>(
        `/card-news/questions/${selectedExam}`,
      ),
    enabled: !!selectedExam,
  });

  // Fetch notes
  const { data: notes } = useQuery({
    queryKey: ['notes-list'],
    queryFn: () => apiGet<{ id: string; title: string; sectionId: string }[]>('/notes'),
    enabled: open && sourceType === 'note',
  });

  // Auto-generate title
  useEffect(() => {
    if (sourceType === 'exam' && selectedExam && selectedQuestion) {
      const q = questions?.find((q: any) => q.questionNumber === selectedQuestion);
      setTitle(
        `제${selectedExam}회 ${selectedQuestion}번 - ${q?.content?.slice(0, 30) || '기출문제'}`,
      );
    } else if (sourceType === 'note' && selectedNote) {
      const n = notes?.find((n: any) => n.id === selectedNote);
      setTitle(n?.title || '요약노트');
    }
  }, [sourceType, selectedExam, selectedQuestion, selectedNote, questions, notes]);

  const handleCreate = async () => {
    if (!title.trim()) return;

    let sourceId: string | undefined;
    if (sourceType === 'exam' && selectedExam && selectedQuestion) {
      sourceId = `${selectedExam}-${selectedQuestion}`;
    } else if (sourceType === 'note' && selectedNote) {
      sourceId = selectedNote;
    }

    const file = await createContent.mutateAsync({ title, sourceType, sourceId });
    setSelectedContentId(file.content.id);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setSourceType('exam');
    setSelectedExam('');
    setSelectedQuestion(null);
    setSelectedNote('');
    setTitle('');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-[500px] max-h-[80vh] overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">새 컨텐츠 만들기</h3>

        {/* Source type selector */}
        <div className="mb-4">
          <div className="text-xs font-bold mb-2 text-gray-700">소스 타입</div>
          <div className="flex gap-2">
            {([
              {
                type: 'exam' as const,
                icon: '📋',
                label: '기출문제',
                desc: '시험 회차 + 문제 선택',
              },
              { type: 'note' as const, icon: '📝', label: '요약노트', desc: '노트 선택' },
              { type: 'free' as const, icon: '✍️', label: '자유 주제', desc: '직접 작성' },
            ]).map((s) => (
              <button
                key={s.type}
                className={`flex-1 p-3 rounded-lg border-2 text-center transition ${
                  sourceType === s.type
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSourceType(s.type);
                  setSelectedExam('');
                  setSelectedQuestion(null);
                  setSelectedNote('');
                }}
              >
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-xs font-bold">{s.label}</div>
                <div className="text-[10px] text-gray-400">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Exam picker */}
        {sourceType === 'exam' && (
          <>
            <div className="mb-3">
              <div className="text-xs font-bold mb-1 text-gray-700">시험 선택</div>
              <select
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                value={selectedExam}
                onChange={(e) => {
                  setSelectedExam(e.target.value);
                  setSelectedQuestion(null);
                }}
              >
                <option value="">선택...</option>
                {exams?.map((e: any) => (
                  <option key={e.examNumber} value={e.examNumber}>
                    제{e.examNumber}회 ({e.questionCount}문제)
                  </option>
                ))}
              </select>
            </div>
            {selectedExam && questions && (
              <div className="mb-3">
                <div className="text-xs font-bold mb-1 text-gray-700">문제 선택</div>
                <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                  {questions.map((q: any) => (
                    <button
                      key={q.questionNumber}
                      className={`w-8 h-8 rounded text-xs border ${
                        selectedQuestion === q.questionNumber
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedQuestion(q.questionNumber)}
                    >
                      {q.questionNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Note picker */}
        {sourceType === 'note' && (
          <div className="mb-3">
            <div className="text-xs font-bold mb-1 text-gray-700">노트 선택</div>
            <select
              className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              value={selectedNote}
              onChange={(e) => setSelectedNote(e.target.value)}
            >
              <option value="">선택...</option>
              {notes?.map((n: any) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div className="mb-4">
          <div className="text-xs font-bold mb-1 text-gray-700">컨텐츠 제목</div>
          <input
            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
          />
        </div>

        <button
          className="w-full py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 disabled:opacity-50"
          onClick={handleCreate}
          disabled={!title.trim() || createContent.isPending}
        >
          {createContent.isPending ? '생성 중...' : '컨텐츠 생성'}
        </button>
      </div>
    </div>
  );
}
