"use client";

import { useState } from "react";
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
  /** 정답 후 true → 콘텐츠 reveal. 정답 전엔 placeholder */
  visible: boolean;
}

/**
 * 태블릿/데스크톱(lg+) 우측 sticky 사이드 패널.
 * 정답 후 사용자가 노트 헤더 클릭하면 본문 펼침. 첫 노트는 자동 펼침.
 * 모바일에서는 hidden — QuestionCard 내부의 기존 link로 폴백.
 */
export default function RelatedNotePanel({ noteContents, visible }: Props) {
  // 정답 후 자동으로 첫 노트 펼침. 사용자 토글 가능.
  const [expandedId, setExpandedId] = useState<string | null>(
    noteContents[0]?.id ?? null,
  );

  if (noteContents.length === 0) return null;

  return (
    <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)]">
      <div className="rounded-2xl border border-amber-200/60 bg-white shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <h3 className="font-serif-kr font-bold text-slate-900 text-base">
              관련 요약노트
            </h3>
            <span className="ml-auto text-[11px] text-amber-700 font-mono font-bold">
              {noteContents.length}편
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            {visible
              ? "이 문제 시대의 핵심 단원입니다 · 헤더 클릭으로 펼치기/접기"
              : "정답 확인 후 표시됩니다"}
          </p>
        </div>

        {/* Body */}
        {visible ? (
          <div className="divide-y divide-slate-100 overflow-y-auto">
            {noteContents.map((note) => {
              const isExpanded = expandedId === note.id;
              return (
                <div key={note.id}>
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : note.id)
                    }
                    className="w-full px-5 py-3 text-left hover:bg-amber-50/60 transition-colors flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {note.title}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5 font-mono">
                        {note.eraLabel}
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-amber-500 shrink-0 transition-transform ${
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
                    <div className="px-5 pb-5 pt-1">
                      <div
                        className="related-note-html text-[13px] leading-relaxed text-slate-700"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                      <Link
                        href={`/notes/${note.id}`}
                        className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        전체 노트 페이지로
                        <svg
                          className="w-3 h-3"
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
        ) : (
          <div className="px-5 py-12 text-center text-slate-400 shrink-0">
            <div className="text-2xl mb-2 opacity-50">🔒</div>
            <p className="text-xs leading-relaxed">
              문제를 풀고 정답을 확인하면
              <br />
              관련 단원이 펼쳐집니다
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
