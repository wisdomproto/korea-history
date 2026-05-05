"use client";

import { useEffect } from "react";
import Link from "next/link";

export interface NoteContent {
  id: string;
  title: string;
  eraLabel: string;
  content: string; // HTML
  sectionId: string;
}

interface Props {
  noteContents: NoteContent[];
  open: boolean;
  onClose: () => void;
}

/**
 * Right-side slide-in drawer for related notes.
 * - Mobile: full-screen.
 * - Tablet/Desktop: 80vw (max 1280px).
 * - All notes shown expanded inline (no collapse) — body uses .note-content
 *   class so globals.css note styling (table, details, badge, keyword,
 *   highlight, timeline …) renders identically to /notes/[noteId] page.
 * - Inner <details> elements are forced open so users see all content.
 * - Closes on ESC, backdrop click, or ✕ button. Body scroll locked.
 */
export default function NoteDrawer({ noteContents, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  if (noteContents.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      style={{ background: "rgba(20, 15, 10, 0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <aside
        className="relative ml-auto w-full md:w-[80vw] md:max-w-[1280px] h-full flex flex-col shadow-2xl"
        style={{
          background: "var(--gc-paper)",
          animation: "slideInRight 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 shrink-0 flex items-center gap-3">
          <span className="text-xl">📝</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif-kr font-bold text-slate-900 text-lg leading-tight">
              관련 요약노트
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {noteContents.length}편 · 이 문제 시대의 핵심 단원 · ESC로 닫기
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-amber-100/80 flex items-center justify-center text-slate-700 transition-colors shrink-0"
            aria-label="닫기"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body — 모든 노트 일렬, 다 펼쳐진 상태 */}
        <div className="flex-1 overflow-y-auto">
          {noteContents.map((note, idx) => (
            <article
              key={note.id}
              className={
                idx > 0
                  ? "border-t-2 border-amber-100"
                  : ""
              }
            >
              <header className="px-6 pt-6 pb-3">
                <div className="text-[11px] text-amber-700 font-mono font-bold tracking-wider uppercase">
                  {note.eraLabel}
                </div>
                <h3 className="font-serif-kr font-bold text-slate-900 text-2xl mt-1 leading-tight">
                  {note.title}
                </h3>
              </header>
              <div className="px-6 pb-6">
                <div
                  className="note-content"
                  dangerouslySetInnerHTML={{ __html: expandAllDetails(note.content) }}
                />
                <Link
                  href={`/notes/${note.id}`}
                  className="inline-flex items-center gap-1.5 mt-6 text-sm font-bold text-amber-700 hover:text-amber-900 transition-colors"
                >
                  전체 노트 페이지로
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </aside>
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Force all <details> elements in note HTML to be open by default,
 * so users see full content (timeline, table, list ...) without clicking.
 * Idempotent: skips elements that already have an `open` attribute.
 */
function expandAllDetails(html: string): string {
  return html.replace(/<details(?![^>]*\bopen\b)([^>]*)>/gi, "<details open$1>");
}
