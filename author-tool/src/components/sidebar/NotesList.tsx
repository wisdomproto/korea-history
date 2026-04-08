import { useMemo } from 'react';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useSummaryNotes } from '@/features/summary-notes/hooks/useSummaryNotes';
import type { NoteIndex } from '@/features/notes/api/notes.api';
import type { ActiveView } from '@/store/editor.store';

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

const SECTION_ERAS: Record<string, string> = {
  s1: '선사·고조선', s2: '삼국', s3: '남북국', s4: '고려',
  s5: '조선 전기', s6: '조선 후기', s7: '근대·현대',
};

export { ERA_COLORS };

interface NotesListProps {
  isCbt: boolean;
  categoryCode: string | undefined;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string) => void;
  setActiveView: (view: ActiveView) => void;
}

export function NotesList({ isCbt, categoryCode, selectedNoteId, setSelectedNoteId, setActiveView }: NotesListProps) {
  const { data: notes } = useNotes();
  const { data: summaryNotes } = useSummaryNotes(isCbt ? categoryCode : undefined);

  const groupedNotes = useMemo(() => {
    if (!notes) return {};
    const groups: Record<string, NoteIndex[]> = {};
    for (const note of notes) {
      const prefix = note.sectionId.split('-')[0];
      const era = SECTION_ERAS[prefix] || '기타';
      if (!groups[era]) groups[era] = [];
      groups[era].push(note);
    }
    return groups;
  }, [notes]);

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
      {isCbt ? (
        summaryNotes && summaryNotes.length > 0 ? (
          summaryNotes.map((note) => (
            <button key={note.id}
              onClick={() => { setSelectedNoteId(note.id); setActiveView('summary-notes-editor' as any); }}
              className={`w-full text-left px-3 py-2 text-sm border-b hover:bg-gray-50 ${selectedNoteId === note.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}>
              <div className="font-medium truncate">{note.title}</div>
              <div className="text-xs text-gray-500">{note.topicCount}개 주제 · {note.questionCount}문제 분석</div>
            </button>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400 text-xs">
            요약노트가 없습니다.<br />시험 패널에서 "요약노트 만들기"를 시도하세요.
          </div>
        )
      ) : (
        <>
          {Object.entries(groupedNotes).map(([era, eraItems]) => (
            <div key={era}>
              <div className="sticky top-0 bg-white px-3 py-1.5 text-[10px] font-semibold text-gray-400 border-b">
                <span className={`mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${ERA_COLORS[era] || 'bg-gray-100 text-gray-600'}`}>{era}</span>
                <span>{eraItems.length}</span>
              </div>
              {eraItems.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`cursor-pointer px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${
                    selectedNoteId === note.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="truncate font-medium">
                    <span className={`inline-block mr-1 rounded px-1 py-0 text-[9px] ${ERA_COLORS[era] || 'bg-gray-100 text-gray-600'}`}>{era}</span>
                    {note.title}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!notes?.length && (
            <div className="p-4 text-center text-xs text-gray-400">노트가 없습니다</div>
          )}
        </>
      )}
    </div>
  );
}
