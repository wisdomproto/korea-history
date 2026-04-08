"use client";

import { useRef, useCallback, useEffect } from "react";

interface NoteContentProps {
  html: string;
}

export default function NoteContent({ html }: NoteContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-expand all on mount
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
      {/* Toolbar */}
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

      {/* Note HTML content */}
      <div
        ref={contentRef}
        className="note-content prose prose-base sm:prose-sm max-w-none prose-p:leading-relaxed prose-li:leading-relaxed prose-td:text-sm prose-th:text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
