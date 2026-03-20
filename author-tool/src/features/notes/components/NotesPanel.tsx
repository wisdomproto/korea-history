import { useState } from 'react';
import { useNotes, useNote, useUpdateNote } from '../hooks/useNotes';

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

const SECTION_LABELS: Record<string, string> = {
  s1: '고대/중세 (삼국·남북국)',
  s2: '고려',
  s3: '조선 전기',
  s4: '조선 후기',
  s5: '근대',
  s6: '일제 강점기',
  s7: '현대',
};

export function NotesPanel() {
  const { data: notes, isLoading } = useNotes();
  const updateMutation = useUpdateNote();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const { data: note, isLoading: noteLoading } = useNote(selectedId);

  const filtered = notes?.filter((n) => {
    if (sectionFilter && n.sectionId !== sectionFilter) return false;
    if (search && !n.title.includes(search) && !n.eraLabel.includes(search)) return false;
    return true;
  });

  const sections = [...new Set(notes?.map((n) => n.sectionId) || [])].sort();

  const handleSaveTitle = () => {
    if (!selectedId || !titleValue.trim()) return;
    updateMutation.mutate({ id: selectedId, data: { title: titleValue.trim() } });
    setEditingTitle(false);
  };

  return (
    <div className="flex h-full">
      {/* Left: Note List */}
      <div className="w-80 flex flex-col border-r bg-white shrink-0">
        <div className="border-b px-4 py-3">
          <h2 className="font-bold text-lg mb-2">📝 요약노트</h2>
          <input
            type="text"
            placeholder="노트 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none mb-2"
          />
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="w-full rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="">전체 시대</option>
            {sections.map((s) => (
              <option key={s} value={s}>{SECTION_LABELS[s] || s}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-400">로딩 중...</div>
          ) : !filtered?.length ? (
            <div className="p-4 text-center text-sm text-gray-400">노트가 없습니다</div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                className={`border-b px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedId === n.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="font-medium text-sm truncate">{n.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${ERA_COLORS[n.era] || 'bg-gray-100 text-gray-600'}`}>
                    {n.era}
                  </span>
                  <span className="text-xs text-gray-400">{n.questionCount}문제</span>
                  <span className="text-xs text-gray-300">{n.id}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {notes && (
          <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-500">
            총 {notes.length}개 노트
          </div>
        )}
      </div>

      {/* Right: Note Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selectedId ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <p>왼쪽에서 노트를 선택하세요</p>
            </div>
          </div>
        ) : noteLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
          </div>
        ) : note ? (
          <div className="p-6 max-w-4xl">
            {/* Header */}
            <div className="mb-4">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    className="text-xl font-bold border-b-2 border-primary-500 outline-none flex-1 pb-1"
                  />
                  <button onClick={handleSaveTitle} className="rounded bg-primary-600 px-3 py-1 text-sm text-white">저장</button>
                  <button onClick={() => setEditingTitle(false)} className="rounded bg-gray-200 px-3 py-1 text-sm">취소</button>
                </div>
              ) : (
                <h1
                  className="text-xl font-bold cursor-pointer hover:text-primary-600"
                  onDoubleClick={() => { setEditingTitle(true); setTitleValue(note.title); }}
                  title="더블클릭으로 제목 수정"
                >
                  {note.title}
                </h1>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${ERA_COLORS[note.era] || 'bg-gray-100 text-gray-600'}`}>
                  {note.eraLabel}
                </span>
                <span className="text-xs text-gray-400">ID: {note.id}</span>
                <span className="text-xs text-gray-400">관련 기출 {note.relatedQuestionIds.length}문제</span>
              </div>
            </div>

            {/* Keywords */}
            {note.relatedKeywords.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-500 mb-2">관련 키워드 ({note.relatedKeywords.length})</h3>
                <div className="flex flex-wrap gap-1">
                  {note.relatedKeywords.slice(0, 30).map((kw) => (
                    <span key={kw} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {kw}
                    </span>
                  ))}
                  {note.relatedKeywords.length > 30 && (
                    <span className="text-xs text-gray-400">+{note.relatedKeywords.length - 30}개</span>
                  )}
                </div>
              </div>
            )}

            {/* Content preview (HTML) */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">노트 내용</h3>
              <div
                className="prose prose-sm max-w-none text-gray-700 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-gray-50 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_details]:mb-2 [&_summary]:cursor-pointer [&_summary]:font-semibold"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
