import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

interface CivilNoteIndexItem {
  slug: string;
  file: string;
  subject: string;
  icon: string;
  exists: boolean;
  chars: number;
  mtime: string | null;
}

interface CivilNoteFull extends CivilNoteIndexItem {
  html: string;
  saved?: boolean;
}

const API_BASE = '/api/civil-notes';

export function CivilNotesPanel() {
  const [index, setIndex] = useState<CivilNoteIndexItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<CivilNoteFull | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'preview' | 'edit'>('preview');
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Load index on mount
  useEffect(() => {
    axios.get<CivilNoteIndexItem[]>(API_BASE).then((r) => {
      setIndex(r.data);
      if (r.data[0] && !selected) setSelected(r.data[0].slug);
    });
  }, []);

  // Load note on selection change
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    axios
      .get<CivilNoteFull>(`${API_BASE}/${selected}`)
      .then((r) => {
        setNote(r.data);
        setDraft(r.data.html);
        setSavedStatus('idle');
      })
      .catch((e) => setError(e.response?.data?.error ?? e.message))
      .finally(() => setLoading(false));
  }, [selected]);

  // Refresh preview iframe srcdoc when draft changes
  useEffect(() => {
    if (previewMode !== 'preview' || !previewRef.current) return;
    previewRef.current.srcdoc = draft;
  }, [draft, previewMode]);

  const dirty = note && draft !== note.html;

  async function handleSave() {
    if (!selected || !dirty) return;
    setSavedStatus('saving');
    setError(null);
    try {
      const r = await axios.put<CivilNoteFull>(`${API_BASE}/${selected}`, { html: draft });
      setNote((prev) => (prev ? { ...prev, ...r.data, html: draft } : prev));
      // Refresh index meta
      setIndex((prev) =>
        prev.map((n) =>
          n.slug === selected ? { ...n, chars: r.data.chars, mtime: r.data.mtime } : n,
        ),
      );
      setSavedStatus('saved');
      setTimeout(() => setSavedStatus('idle'), 2000);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
      setSavedStatus('error');
    }
  }

  // Ctrl/Cmd+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, draft, selected]);

  return (
    <div className="flex h-full flex-1">
      {/* Left: note list */}
      <aside className="w-72 shrink-0 border-r bg-white overflow-y-auto">
        <div className="border-b px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            9급 단권화
          </div>
          <div className="mt-1 text-sm font-bold">13개 과목</div>
          <div className="mt-1 text-[11px] text-gray-500">docs/{'{slug}'}-summary-note.html</div>
        </div>
        <ul className="divide-y">
          {index.map((n) => (
            <li key={n.slug}>
              <button
                onClick={() => setSelected(n.slug)}
                className={`w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-amber-50 transition-colors ${
                  selected === n.slug ? 'bg-amber-100 text-amber-900' : ''
                }`}
              >
                <span className="text-lg">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{n.subject}</div>
                  <div className="text-[10px] font-mono text-gray-500">
                    {Math.round(n.chars / 1024)} KB · {n.mtime?.slice(0, 10) ?? '?'}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Right: editor */}
      <main className="flex-1 flex flex-col min-w-0">
        {loading && (
          <div className="flex-1 flex items-center justify-center text-gray-400">로딩...</div>
        )}
        {error && !loading && (
          <div className="m-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && note && (
          <>
            {/* Toolbar */}
            <div className="border-b bg-white px-4 py-2.5 flex items-center gap-2">
              <h2 className="text-sm font-bold">
                <span className="mr-1.5">{note.icon}</span>
                {note.subject}
              </h2>
              <span className="text-[10px] font-mono text-gray-500">
                {Math.round(draft.length / 1024)} KB
                {dirty && <span className="ml-1 text-amber-600">●</span>}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-0.5 flex">
                  <button
                    onClick={() => setPreviewMode('preview')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      previewMode === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    미리보기
                  </button>
                  <button
                    onClick={() => setPreviewMode('edit')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      previewMode === 'edit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    HTML 편집
                  </button>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!dirty || savedStatus === 'saving'}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    dirty
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Ctrl/Cmd + S"
                >
                  {savedStatus === 'saving'
                    ? '저장 중...'
                    : savedStatus === 'saved'
                      ? '✓ 저장됨'
                      : '저장 (⌘S)'}
                </button>

                <a
                  href={`/docs/${note.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  새 탭 ↗
                </a>
              </div>
            </div>

            {/* Pane */}
            {previewMode === 'preview' ? (
              <iframe
                ref={previewRef}
                title={note.subject}
                srcDoc={draft}
                className="flex-1 w-full bg-white border-0"
                sandbox="allow-same-origin"
              />
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 w-full p-4 font-mono text-xs text-gray-800 bg-gray-50 border-0 outline-none resize-none"
                spellCheck={false}
              />
            )}

            {/* Footer hint */}
            <div className="border-t bg-gray-50 px-4 py-2 text-[10px] font-mono text-gray-500 flex items-center gap-3">
              <span>경로: docs/{note.file}</span>
              <span>·</span>
              <span>저장 후 git commit + push로 배포 (sync 스크립트 자동 실행)</span>
              {dirty && (
                <span className="ml-auto text-amber-700 font-bold">
                  변경사항 있음 — 저장하세요
                </span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
