import { useState } from 'react';
import { useGenerateSummaryNote } from '../hooks/useGenerateSummaryNote';
import { Button } from '@/components/Button';
import type { CbtExamMeta } from '@/features/cbt-import/api/cbt.api';

interface Props {
  open: boolean;
  onClose: () => void;
  categoryCode: string;
  exams: CbtExamMeta[];
  onComplete: (noteId: string) => void;
}

export function GenerateModal({ open, onClose, categoryCode, exams, onComplete }: Props) {
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'quick' | 'polish'>('quick');
  const { generating, step, current, total, topicCount, error, noteId, generate } = useGenerateSummaryNote();

  if (!open) return null;

  const handleStart = () => {
    generate({
      categoryCode,
      examIds: scope === 'all' ? [] : selectedExamIds,
      mode,
    });
  };

  // Step labels for progress display
  const stepLabels: Record<string, string> = {
    loading: '문제 로딩 중...',
    extracting: `개념 추출 중... (${current}/${total} 문제)`,
    grouping: `그룹핑 중... (${topicCount}개 주제)`,
    polishing: '요약노트 다듬기 중...',
  };

  if (noteId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-[480px] bg-white rounded-xl shadow-2xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-bold mb-2">요약노트 생성 완료!</h3>
          <p className="text-sm text-gray-600 mb-4">{topicCount}개 주제, {total}개 문제 분석</p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={onClose}>닫기</Button>
            <Button onClick={() => { onComplete(noteId); onClose(); }}>노트 열기</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] bg-white rounded-xl shadow-2xl flex flex-col">
        <div className="px-5 pt-5 pb-3 border-b">
          <h2 className="text-lg font-bold">요약노트 만들기</h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          {generating ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
              <p className="font-medium">{stepLabels[step] || step}</p>
              {step === 'extracting' && total > 0 && (
                <div className="mt-3 mx-auto w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${(current / total) * 100}%` }} />
                </div>
              )}
              {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
            </div>
          ) : (
            <>
              {/* Scope selection */}
              <div>
                <label className="block text-sm font-medium mb-2">범위</label>
                <div className="flex gap-2">
                  <button onClick={() => setScope('all')} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${scope === 'all' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                    전체 회차 ({exams.length}개)
                  </button>
                  <button onClick={() => setScope('selected')} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${scope === 'selected' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                    선택한 시험만
                  </button>
                </div>
              </div>

              {/* Exam checkboxes when scope is 'selected' */}
              {scope === 'selected' && (
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {exams.map((e) => (
                    <label key={e.exam_id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={selectedExamIds.includes(e.exam_id)}
                        onChange={(ev) => {
                          if (ev.target.checked) setSelectedExamIds([...selectedExamIds, e.exam_id]);
                          else setSelectedExamIds(selectedExamIds.filter((id) => id !== e.exam_id));
                        }}
                      />
                      {e.label}
                    </label>
                  ))}
                </div>
              )}

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium mb-2">생성 모드</label>
                <div className="flex gap-2">
                  <button onClick={() => setMode('quick')} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${mode === 'quick' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                    ⚡ 빠른 생성
                  </button>
                  <button onClick={() => setMode('polish')} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${mode === 'polish' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                    ✨ 고품질
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={generating}>취소</Button>
          {!generating && (
            <Button onClick={handleStart} disabled={scope === 'selected' && selectedExamIds.length === 0}>
              생성 시작
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
