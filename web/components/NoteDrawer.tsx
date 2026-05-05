"use client";

import { useEffect, useState } from "react";
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
 * - Desktop/Tablet: 720px wide right panel.
 * - Mobile: full-screen.
 * - Closes on ESC, backdrop click, or ✕ button.
 * - Body scroll locked while open.
 * - First note auto-expanded; user can switch via header click.
 */
export default function NoteDrawer({ noteContents, open, onClose }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(
    noteContents[0]?.id ?? null,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    // 새로 open될 때마다 첫 노트로 reset
    setExpandedId(noteContents[0]?.id ?? null);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, noteContents]);

  if (!open) return null;
  if (noteContents.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      style={{ background: "rgba(20, 15, 10, 0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <aside
        className="relative ml-auto w-full md:max-w-[720px] h-full flex flex-col animate-fade-in shadow-2xl"
        style={{
          background: "var(--gc-paper)",
          animation: "slideInRight 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 shrink-0 flex items-center gap-3">
          <span className="text-xl">📝</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif-kr font-bold text-slate-900 text-lg leading-tight">
              관련 요약노트
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {noteContents.length}편 · 헤더 클릭으로 펼치기/접기 · ESC로 닫기
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

        {/* Body — 노트 list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {noteContents.map((note) => {
            const isExpanded = expandedId === note.id;
            return (
              <div key={note.id}>
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : note.id)
                  }
                  className="w-full px-5 py-4 text-left hover:bg-amber-50/60 transition-colors flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-slate-900 truncate">
                      {note.title}
                    </div>
                    <div className="text-[12px] text-amber-700 mt-0.5 font-mono">
                      {note.eraLabel}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-amber-500 shrink-0 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-6 pt-2">
                    <div
                      className="related-note-html text-[14px] leading-relaxed text-slate-700"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                    <Link
                      href={`/notes/${note.id}`}
                      className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-bold text-amber-700 hover:text-amber-900 transition-colors"
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
                )}
              </div>
            );
          })}
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
