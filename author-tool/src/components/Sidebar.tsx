import { useExams } from '@/features/exam/hooks/useExams';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useEditorStore } from '@/store/editor.store';
import { examApi } from '@/features/exam/api/exam.api';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './Button';
import { useState, useRef } from 'react';
import type { ExamCompleteness } from '@/lib/types';
import { useContents } from '@/features/content/hooks/useContent';
import { NewContentDialog } from '@/features/content/components/NewContentDialog';
import type { ContentMeta } from '@/lib/content-types';

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

function getStatusTooltip(c: ExamCompleteness): string {
  if (!c.hasQuestions) return '문제 없음';
  const issues: string[] = [];
  if (c.missingContent > 0) issues.push(`내용 ${c.missingContent}개 부족`);
  if (c.missingAnswers > 0) issues.push(`정답 ${c.missingAnswers}개 부족`);
  if (c.missingImages > 0) issues.push(`이미지 ${c.missingImages}개 부족`);
  if (c.missingExplanations > 0) issues.push(`해설 ${c.missingExplanations}개 부족`);
  return issues.length === 0 ? '완료' : issues.join(' · ');
}

type SidebarTab = 'exam' | 'content';

interface SidebarProps {
  onCreateExam: () => void;
  onDeleteExam: (id: number) => void;
}

export function Sidebar({ onCreateExam, onDeleteExam }: SidebarProps) {
  const { data: exams, isLoading } = useExams();
  const { data: notes } = useNotes();
  const { data: contents } = useContents();
  const { selectedExamId, setSelectedExamId, selectedContentId, setSelectedContentId, activeView, setActiveView } = useEditorStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SidebarTab>('exam');
  const [search, setSearch] = useState('');
  const [showNewContent, setShowNewContent] = useState(false);
  const [contentFilter, setContentFilter] = useState<'all' | 'exam' | 'note' | 'free'>('all');
  const [contentSearch, setContentSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const savingRef = useRef(false);

  // DnD state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const filtered = (() => {
    let list = exams?.filter(
      (e) => !search || `${e.examNumber}회`.includes(search) || e.examDate.includes(search) || (e.name ?? '').includes(search),
    );
    if (list && sortOrder) {
      list = [...list].sort((a, b) => {
        const nameA = a.name || `제${a.examNumber}회`;
        const nameB = b.name || `제${b.examNumber}회`;
        return sortOrder === 'asc' ? nameA.localeCompare(nameB, 'ko') : nameB.localeCompare(nameA, 'ko');
      });
    }
    return list;
  })();

  const canDrag = !search && !sortOrder;

  const handleDragStart = (idx: number) => { if (!canDrag) return; dragRef.current = idx; setDragIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { if (!canDrag) return; e.preventDefault(); setOverIdx(idx); };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const handleDrop = async (idx: number) => {
    const fromIdx = dragRef.current;
    if (!canDrag || !exams || fromIdx === null || fromIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    const ids = exams.map((e) => e.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(idx, 0, moved);
    setDragIdx(null); setOverIdx(null);
    try { await examApi.reorder(ids); qc.invalidateQueries({ queryKey: ['exams'] }); }
    catch (err) { console.error('시험 순서 변경 실패:', err); }
  };

  const startEditing = (exam: { id: number; name?: string; examNumber: number }) => {
    setEditingId(exam.id);
    setEditValue(exam.name || `제${exam.examNumber}회 한국사능력검정시험`);
  };

  const saveEdit = async (id: number) => {
    if (savingRef.current) return;
    savingRef.current = true;
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed) { savingRef.current = false; return; }
    qc.setQueryData(['exams'], (old: any) => old?.map((e: any) => (e.id === id ? { ...e, name: trimmed } : e)));
    try { await examApi.update(id, { name: trimmed } as any); qc.invalidateQueries({ queryKey: ['exam', id] }); }
    catch (err) { console.error('시험 이름 수정 실패:', err); qc.invalidateQueries({ queryKey: ['exams'] }); }
    finally { savingRef.current = false; }
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
            href={window.location.hostname === 'localhost' ? 'http://localhost:8081' : 'https://gcnote.co.kr'}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-primary-100 hover:text-primary-700"
            title="웹사이트 열기"
          >
            사이트 &rarr;
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('exam')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'exam'
              ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50/50'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          📚 시험
        </button>
        <button
          onClick={() => setTab('content')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'content'
              ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50/50'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          ✏️ 컨텐츠
        </button>
      </div>

      {/* ═══ Exam Tab ═══ */}
      {tab === 'exam' && (
        <>
          <div className="space-y-2 border-b px-4 py-3">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="시험 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <button
                onClick={() => setSortOrder((prev) => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null)}
                className={`rounded-lg border px-2 py-2 text-sm transition-colors ${sortOrder ? 'border-primary-300 bg-primary-50 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
                title={sortOrder === 'asc' ? '이름 오름차순' : sortOrder === 'desc' ? '이름 내림차순' : '정렬 없음 (드래그 순서)'}
              >
                {sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : '↕'}
              </button>
            </div>
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
                  {canDrag && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-[10px] text-gray-200 group-hover:text-gray-400 select-none">⠿</span>
                  )}
                  <div className="flex items-center justify-between">
                    {editingId === exam.id ? (
                      <input
                        type="text" value={editValue} autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(exam.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(exam.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="mr-2 flex-1 rounded border border-primary-300 px-1.5 py-0.5 text-sm font-medium focus:outline-none focus:border-primary-500"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => { e.stopPropagation(); startEditing(exam); }}
                        className={`font-medium truncate cursor-text ${!exam.isVisible ? 'text-gray-400' : ''}`}
                        title={exam.name || `제${exam.examNumber}회`}
                      >
                        {exam.name || `제${exam.examNumber}회`}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${exam.examType === 'advanced' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                        {exam.examType === 'advanced' ? '심화' : '기본'}
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try { await examApi.update(exam.id, { isVisible: !exam.isVisible }); qc.invalidateQueries({ queryKey: ['exams'] }); }
                          catch (err) { console.error('공개 상태 변경 실패:', err); }
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`제${exam.examNumber}회를 삭제하시겠습니까?\n모든 문제가 함께 삭제됩니다.`)) onDeleteExam(exam.id);
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
                    <div className="flex items-center gap-1.5">
                      {exam.completeness && (
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            exam.completeness.status === 'complete' ? 'bg-green-500' :
                            exam.completeness.status === 'partial' ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}
                          title={getStatusTooltip(exam.completeness)}
                        />
                      )}
                      <span>{exam.questionCount}문제</span>
                    </div>
                  </div>
                  {exam.isFree && <span className="mt-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">무료</span>}
                </div>
              ))
            )}
          </div>

          {exams && (
            <div className="border-t bg-gray-50 px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  총 {exams.length}개 시험 / {exams.reduce((s, e) => s + e.questionCount, 0)}문제
                </span>
                <DeployButton />
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ Content Tab ═══ */}
      {tab === 'content' && (
        <>
          <div className="space-y-2 border-b px-4 py-3">
            <button
              className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium hover:bg-gray-50"
              onClick={() => setShowNewContent(true)}
            >
              + 새 컨텐츠
            </button>
            <input
              type="text"
              placeholder="🔍 검색..."
              value={contentSearch}
              onChange={(e) => setContentSearch(e.target.value)}
              className="w-full rounded-lg border px-3 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
            />
            <div className="flex gap-1 flex-wrap">
              {(['all', 'exam', 'note', 'free'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setContentFilter(f)}
                  className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                    contentFilter === f ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'exam' ? '기출' : f === 'note' ? '노트' : '자유'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {contents?.filter((c: ContentMeta) => {
              if (contentFilter !== 'all' && c.sourceType !== contentFilter) return false;
              if (contentSearch && !c.title.includes(contentSearch)) return false;
              return true;
            }).map((c: ContentMeta) => (
              <div
                key={c.id}
                onClick={() => setSelectedContentId(c.id)}
                className={`cursor-pointer px-4 py-2 border-b transition-colors hover:bg-gray-50 ${
                  selectedContentId === c.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="text-xs font-bold truncate">{c.title}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                  <span>
                    {c.sourceType === 'exam' ? '📋 기출' : c.sourceType === 'note' ? '📝 노트' : '✍️ 자유'}
                  </span>
                  <span>{new Date(c.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
            {contents?.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">컨텐츠가 없습니다</div>
            )}
          </div>

          <div className="border-t bg-gray-50 px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">총 {contents?.length || 0}개 컨텐츠</span>
              <DeployButton />
            </div>
          </div>

          <NewContentDialog open={showNewContent} onClose={() => setShowNewContent(false)} />
        </>
      )}
    </aside>
  );
}

function DeployButton() {
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

  const handleDeploy = async () => {
    if (status === 'deploying') return;
    setStatus('deploying');
    try { await examApi.deploy(); setStatus('success'); setTimeout(() => setStatus('idle'), 3000); }
    catch { setStatus('error'); setTimeout(() => setStatus('idle'), 3000); }
  };

  return (
    <button
      onClick={handleDeploy}
      disabled={status === 'deploying'}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
        status === 'deploying' ? 'bg-amber-100 text-amber-700 cursor-wait' :
        status === 'success' ? 'bg-green-100 text-green-700' :
        status === 'error' ? 'bg-red-100 text-red-700' :
        'bg-primary-100 text-primary-700 hover:bg-primary-200'
      }`}
      title="웹사이트에 최신 데이터 배포"
    >
      {status === 'deploying' ? '배포 중...' :
       status === 'success' ? '배포 완료 ✓' :
       status === 'error' ? '배포 실패' :
       '웹 배포'}
    </button>
  );
}

export { ERA_COLORS };
