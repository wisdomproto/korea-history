import { useState, useRef } from 'react';
import { questionApi } from '../api/question.api';
import type { Question } from '@/lib/types';

interface QuestionListProps {
  questions: Question[];
  selectedId: number | null;
  examId: number;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onReorder: () => void;
}

const ERA_SHORT: Record<string, string> = {
  '선사·고조선': '선사',
  '삼국': '삼국',
  '남북국': '남북',
  '고려': '고려',
  '조선 전기': '조전',
  '조선 후기': '조후',
  '근대': '근대',
  '현대': '현대',
};

export function QuestionList({ questions, selectedId, examId, onSelect, onDelete, onReorder }: QuestionListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragRef.current = idx;
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = async (idx: number) => {
    const fromIdx = dragRef.current;
    if (fromIdx === null || fromIdx === idx) { setDragIdx(null); setOverIdx(null); return; }

    const ids = questions.map((q) => q.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(idx, 0, moved);

    setDragIdx(null);
    setOverIdx(null);
    try {
      await questionApi.reorder(examId, ids);
      onReorder();
    } catch (err) {
      console.error('순서 변경 실패:', err);
    }
  };

  if (!questions.length) {
    return <div className="py-8 text-center text-sm text-gray-400">문제가 없습니다</div>;
  }

  return (
    <div>
      {questions.map((q, idx) => (
        <div
          key={q.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(idx); }}
          onClick={() => onSelect(q.id)}
          className={`group flex items-center gap-2 border-b px-3 py-2 cursor-pointer transition-all text-sm ${
            selectedId === q.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
          } ${dragIdx === idx ? 'opacity-40' : ''} ${overIdx === idx && dragIdx !== idx ? 'border-t-2 border-t-primary-400' : ''}`}
        >
          {/* Drag handle */}
          <span className="cursor-grab text-gray-300 group-hover:text-gray-500 shrink-0" title="드래그하여 이동">⠿</span>

          {/* Question number */}
          <span className="w-6 text-center font-mono text-xs text-gray-400 shrink-0">{q.questionNumber}</span>

          {/* Content preview */}
          <div className="flex-1 min-w-0">
            <p className="truncate text-gray-800">{q.content || '(내용 없음)'}</p>
            <div className="flex gap-1 mt-0.5">
              <span className="text-[10px] text-gray-400">{ERA_SHORT[q.era] ?? q.era}</span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-[10px] text-gray-400">{q.category}</span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-[10px] text-gray-400">{q.points}점</span>
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(q.id); }}
            className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="삭제"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
