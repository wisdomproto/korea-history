import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useNotes, useNote, useUpdateNote } from '../hooks/useNotes';
import type { NoteIndex } from '../api/notes.api';
import axios from 'axios';

const ERA_MAP: Record<string, string> = {
  s1: '선사·고조선',
  s2: '삼국',
  s3: '남북국',
  s4: '고려',
  s5: '조선 전기',
  s6: '조선 후기',
  s7: '근대·현대',
};

function getEraFromSectionId(sectionId: string): string {
  const prefix = sectionId.replace(/-.*$/, '');
  return ERA_MAP[prefix] || sectionId;
}

export function NoteEditorPanel() {
  const { selectedNoteId, setSelectedNoteId } = useEditorStore();
  const { data: notes, isLoading: notesLoading } = useNotes();
  const { data: note, isLoading: noteLoading } = useNote(selectedNoteId);
  const updateMutation = useUpdateNote();

  const [search, setSearch] = useState('');
  const [titleValue, setTitleValue] = useState('');
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [charCount, setCharCount] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSyncedHtml = useRef('');

  // Group notes by era
  const groupedNotes = useMemo(() => {
    if (!notes) return [];

    const filtered = notes.filter((n) => {
      if (!search) return true;
      return n.title.includes(search) || n.sectionId.includes(search) || n.eraLabel?.includes(search);
    });

    const groups: { era: string; prefix: string; notes: NoteIndex[] }[] = [];
    const prefixOrder = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];

    for (const prefix of prefixOrder) {
      const era = ERA_MAP[prefix];
      const eraNotes = filtered.filter((n) => n.sectionId.startsWith(prefix));
      if (eraNotes.length > 0) {
        groups.push({ era, prefix, notes: eraNotes });
      }
    }

    return groups;
  }, [notes, search]);

  // Sync editor content when note changes
  useEffect(() => {
    if (note) {
      setTitleValue(note.title);
      if (editorRef.current && note.content !== lastSyncedHtml.current) {
        editorRef.current.innerHTML = note.content;
        lastSyncedHtml.current = note.content;
      }
      setCharCount(stripHtml(note.content).length);
      setSavedStatus('idle');
    }
  }, [note?.id, note?.content]);

  // Auto-save content with debounce
  const handleInput = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    if (editorRef.current) {
      setCharCount(editorRef.current.innerText.length);
    }

    saveTimeout.current = setTimeout(() => {
      if (!editorRef.current || !selectedNoteId) return;
      const html = editorRef.current.innerHTML;
      lastSyncedHtml.current = html;
      setSavedStatus('saving');
      updateMutation.mutate(
        { id: selectedNoteId, data: { content: html } },
        { onSuccess: () => setSavedStatus('saved') },
      );
    }, 500);
  }, [selectedNoteId, updateMutation]);

  // Auto-save title with debounce
  const titleTimeout = useRef<ReturnType<typeof setTimeout>>();
  const handleTitleChange = useCallback(
    (value: string) => {
      setTitleValue(value);
      if (titleTimeout.current) clearTimeout(titleTimeout.current);
      titleTimeout.current = setTimeout(() => {
        if (!selectedNoteId) return;
        setSavedStatus('saving');
        updateMutation.mutate(
          { id: selectedNoteId, data: { title: value.trim() } },
          { onSuccess: () => setSavedStatus('saved') },
        );
      }, 500);
    },
    [selectedNoteId, updateMutation],
  );

  // Toolbar commands
  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  // Image upload
  const handleImageUpload = async (file: File) => {
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await axios.post('/api/images/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string = res.data.data.url;
      document.execCommand('insertHTML', false, `<img src="${url}" style="max-width:100%;" />`);
      editorRef.current?.focus();
      handleInput();
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('이미지 업로드에 실패했습니다.');
    }
  };

  // Link insertion
  const handleInsertLink = () => {
    const url = prompt('URL을 입력하세요:');
    if (url) {
      document.execCommand('createLink', false, url);
      editorRef.current?.focus();
    }
  };

  // Image delete in editor — delegated click handler
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('img-delete-btn')) {
        const img = target.previousElementSibling as HTMLElement | null;
        if (img && img.tagName === 'IMG') {
          const wrapper = target.parentElement;
          wrapper?.remove();
        } else {
          // Fallback: remove the button's parent
          target.parentElement?.remove();
        }
        handleInput();
        return;
      }
    },
    [handleInput],
  );

  // Wrap images with delete button overlay using MutationObserver
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const wrapImages = () => {
      const images = editor.querySelectorAll('img:not([data-wrapped])');
      images.forEach((img) => {
        img.setAttribute('data-wrapped', 'true');
        // Only wrap if not already in a wrapper
        if (img.parentElement?.classList.contains('img-wrapper')) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'img-wrapper';
        wrapper.style.cssText = 'position:relative;display:inline-block;';
        const btn = document.createElement('button');
        btn.className = 'img-delete-btn';
        btn.textContent = '\u2715';
        btn.style.cssText =
          'position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;line-height:1;z-index:10;';
        btn.contentEditable = 'false';
        img.parentNode?.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(btn);
      });
    };

    wrapImages();

    const observer = new MutationObserver(() => wrapImages());
    observer.observe(editor, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [note?.id]);

  return (
    <div className="flex h-full w-full">
      {/* Left Panel — Note List */}
      <div className="w-[220px] flex flex-col border-r bg-white shrink-0">
        <div className="border-b px-3 py-3">
          <input
            type="text"
            placeholder="노트 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {notesLoading ? (
            <div className="p-4 text-center text-xs text-gray-400">로딩 중...</div>
          ) : groupedNotes.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">결과 없음</div>
          ) : (
            groupedNotes.map((group) => (
              <div key={group.prefix}>
                <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-500 border-b border-gray-100">
                  {group.era} ({group.notes.length})
                </div>
                {group.notes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNoteId(n.id)}
                    className={`px-3 py-2 cursor-pointer text-xs transition-colors hover:bg-gray-50 border-l-3 ${
                      selectedNoteId === n.id
                        ? 'bg-emerald-50 border-l-emerald-500 font-medium'
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="truncate">{n.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{n.id}</div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {notes && (
          <div className="border-t bg-gray-50 px-3 py-1.5 text-[10px] text-gray-400">
            총 {notes.length}개 노트
          </div>
        )}
      </div>

      {/* Right Panel — Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedNoteId ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">왼쪽에서 노트를 선택하세요</p>
            </div>
          </div>
        ) : noteLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600" />
          </div>
        ) : note ? (
          <>
            {/* Title */}
            <div className="px-5 pt-4 pb-2">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-lg font-bold border-none outline-none bg-transparent placeholder-gray-300 focus:ring-0"
                placeholder="노트 제목"
              />
            </div>

            {/* Keywords */}
            {note.relatedKeywords && note.relatedKeywords.length > 0 && (
              <div className="px-5 pb-2 flex flex-wrap gap-1">
                {note.relatedKeywords.slice(0, 20).map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px]"
                  >
                    {kw}
                  </span>
                ))}
                {note.relatedKeywords.length > 20 && (
                  <span className="text-[10px] text-gray-400">+{note.relatedKeywords.length - 20}개</span>
                )}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-5 pb-2 border-b border-gray-100">
              {[
                { cmd: 'bold', label: 'B', style: 'font-bold' },
                { cmd: 'italic', label: 'I', style: 'italic' },
                { cmd: 'formatBlock', label: 'H2', value: 'h2' },
                { cmd: 'formatBlock', label: 'H3', value: 'h3' },
                { cmd: 'insertUnorderedList', label: '\u2022' },
                { cmd: 'insertOrderedList', label: '1.' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  className={`px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 ${btn.style || ''}`}
                  onClick={() => execCommand(btn.cmd, btn.value)}
                  title={btn.label}
                >
                  {btn.label}
                </button>
              ))}

              <div className="w-px h-5 bg-gray-200 mx-1" />

              <button
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
                title="이미지 삽입"
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = '';
                }}
              />

              <button
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                onClick={handleInsertLink}
                title="링크 삽입"
              >
                🔗
              </button>
            </div>

            {/* Content Editor */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div
                ref={editorRef}
                className="min-h-[400px] border border-gray-200 rounded-lg p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-200 prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:bg-gray-50 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_details]:mb-2 [&_summary]:cursor-pointer [&_summary]:font-semibold"
                contentEditable
                onInput={handleInput}
                onClick={handleEditorClick}
                suppressContentEditableWarning
              />
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <span className="font-mono">{note.sectionId}</span>
                <span>·</span>
                <span>{getEraFromSectionId(note.sectionId)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{charCount.toLocaleString()}자</span>
                <span>·</span>
                <span>
                  {savedStatus === 'saving'
                    ? '저장 중...'
                    : savedStatus === 'saved'
                      ? '자동 저장됨 \u2713'
                      : '\u00A0'}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
