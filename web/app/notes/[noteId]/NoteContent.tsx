"use client";

import { useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

interface NoteContentProps {
  html: string;
}

export default function NoteContent({ html }: NoteContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { user, loading, openLogin } = useAuth();
  // 비로그인만 미리보기(soft clip). 로그인(무료 포함)은 전체.
  // 봇/검색엔진은 JS 미실행 → 전체 HTML이 DOM에 그대로 존재(색인·SEO 유지).
  const gated = !loading && !user;

  // Auto-expand all on mount (clip 여부와 무관하게 DOM엔 전체 펼침 → 봇이 전체 텍스트 색인)
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    }
  }, []);

  const expandAll = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
  }, []);

  const collapseAll = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll("details").forEach((d) => d.removeAttribute("open"));
  }, []);

  return (
    <div>
      {/* Toolbar — 로그인 사용자만 (비로그인은 미리보기라 펼치기 무의미) */}
      {!gated && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={expandAll}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            전체 펼치기
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
            전체 닫기
          </button>
        </div>
      )}

      <div className="relative">
        {/* Note HTML content — gated면 시각적으로만 clip (DOM엔 전체) */}
        <div
          ref={contentRef}
          className="note-content prose prose-base sm:prose-sm max-w-none prose-p:leading-relaxed prose-li:leading-relaxed prose-td:text-sm prose-th:text-sm"
          style={
            gated
              ? {
                  maxHeight: 480,
                  overflow: "hidden",
                  WebkitMaskImage: "linear-gradient(180deg,#000 62%,transparent)",
                  maskImage: "linear-gradient(180deg,#000 62%,transparent)",
                }
              : undefined
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {gated && (
          <div className="relative -mt-12 rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-[0_-20px_40px_-24px_rgba(0,0,0,0.18)]">
            <div className="text-3xl mb-1.5">📖</div>
            <h3 className="font-serif-kr text-lg font-extrabold text-slate-900 mb-1.5">
              로그인하고 전체 요약노트 보기
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              가입하면 <b>7일간 무료</b>로 전체 노트와 문제 연결까지 모두 열려요. 카드 등록 없이.
            </p>
            <button
              onClick={openLogin}
              className="rounded-xl bg-[var(--gc-amber,#B45309)] px-6 py-3 text-sm font-extrabold text-white transition hover:brightness-105"
            >
              로그인 / 가입하고 전체 보기
            </button>
            <p className="text-[11px] text-slate-400 mt-3">
              검색·미리보기는 그대로 노출돼 SEO는 유지됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
