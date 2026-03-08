import { useExams } from '@/features/exam/hooks/useExams';
import { useEditorStore } from '@/store/editor.store';
import { examApi } from '@/features/exam/api/exam.api';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './Button';
import { useState, useRef } from 'react';

const ERA_COLORS: Record<string, string> = {
  '선사·고조선': 'bg-amber-100 text-amber-800',
  '삼국': 'bg-red-100 text-red-800',
  '남북국': 'bg-orange-100 text-orange-800',
  '고려': 'bg-emerald-100 text-emerald-800',
  '조선 전기': 'bg-blue-100 text-blue-800',
  '조선 후기': 'bg-indigo-100 text-indigo-800',
  '근대': 'bg-purple-100 text-purple-800',
  '현대': 'bg-pink-100 text-pink-800',
};

interface SidebarProps {
  onCreateExam: () => void;
  onDeleteExam: (id: number) => void;
}

export function Sidebar({ onCreateExam, onDeleteExam }: SidebarProps) {
  const { data: exams, isLoading } = useExams();
  const { selectedExamId, setSelectedExamId, setActiveView } = useEditorStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // DnD state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const filtered = exams?.filter(
    (e) => !search || `${e.examNumber}회`.includes(search) || e.examDate.includes(search),
  );

  const canDrag = !search; // Disable DnD when filtering

  const handleDragStart = (idx: number) => {
    if (!canDrag) return;
    dragRef.current = idx;
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (!canDrag) return;
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = async (idx: number) => {
    const fromIdx = dragRef.current;
    if (!canDrag || !exams || fromIdx === null || fromIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }

    const ids = exams.map((e) => e.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(idx, 0, moved);

    setDragIdx(null);
    setOverIdx(null);
    try {
      await examApi.reorder(ids);
      qc.invalidateQueries({ queryKey: ['exams'] });
    } catch (err) {
      console.error('시험 순서 변경 실패:', err);
    }
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1
            className="cursor-pointer text-lg font-bold text-primary-700"
            onClick={() => { setSelectedExamId(null); setActiveView('dashboard'); }}
          >
            한국사 저작도구
          </h1>
          <a
            href="http://localhost:8081"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-primary-100 hover:text-primary-700"
            title="한국사 마스터 앱 열기"
          >
            앱 보기 &rarr;
          </a>
        </div>
      </div>

      {/* Search + Create */}
      <div className="space-y-2 border-b px-4 py-3">
        <input
          type="text"
          placeholder="시험 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onCreateExam}>+ 새 시험</Button>
          <Button size="sm" variant="secondary" onClick={() => setActiveView('generator')}>AI 생성</Button>
        </div>
      </div>

      {/* Exam List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-400">로딩 중...</div>
        ) : !filtered?.length ? (
          <div className="p-4 text-center text-sm text-gray-400">시험이 없습니다</div>
        ) : (
          filtered.map((exam, idx) => (
            <div
              key={exam.id}
              draggable={canDrag}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(idx)}
              onClick={() => setSelectedExamId(exam.id)}
              className={`group relative w-full border-b px-4 py-3 text-left transition-all cursor-pointer hover:bg-gray-50 ${
                selectedExamId === exam.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'
              } ${dragIdx === idx ? 'opacity-40' : ''} ${overIdx === idx && dragIdx !== idx ? 'border-t-2 border-t-primary-400' : ''}`}
            >
              {/* Drag handle */}
              {canDrag && (
                <span className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-[10px] text-gray-200 group-hover:text-gray-400 select-none">⠿</span>
              )}

              <div className="flex items-center justify-between">
                <span className={`font-medium ${!exam.isVisible ? 'text-gray-400' : ''}`}>제{exam.examNumber}회</span>
                <div className="flex items-center gap-1">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${exam.examType === 'advanced' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                    {exam.examType === 'advanced' ? '심화' : '기본'}
                  </span>
                  {/* Visibility toggle */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await examApi.update(exam.id, { isVisible: !exam.isVisible });
                        qc.invalidateQueries({ queryKey: ['exams'] });
                      } catch (err) {
                        console.error('공개 상태 변경 실패:', err);
                      }
                    }}
                    className={`rounded p-0.5 transition-all ${exam.isVisible ? 'text-primary-500 hover:bg-primary-50' : 'text-gray-300 hover:bg-gray-100'}`}
                    title={exam.isVisible ? '앱에서 숨기기' : '앱에 공개하기'}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {exam.isVisible ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      )}
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`제${exam.examNumber}회를 삭제하시겠습니까?\n모든 문제가 함께 삭제됩니다.`)) {
                        onDeleteExam(exam.id);
                      }
                    }}
                    className="rounded p-0.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    title="시험 삭제"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>{exam.examDate}</span>
                <span>{exam.questionCount}문제</span>
              </div>
              {exam.isFree && <span className="mt-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">무료</span>}
            </div>
          ))
        )}
      </div>

      {/* Stats footer */}
      {exams && (
        <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-500">
          총 {exams.length}개 시험 / {exams.reduce((s, e) => s + e.questionCount, 0)}문제
        </div>
      )}
    </aside>
  );
}

export { ERA_COLORS };
