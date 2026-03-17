"use client";

import { useRef, useCallback } from "react";

interface NoteContentProps {
  html: string;
}

export default function NoteContent({ html }: NoteContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const expandAll = useCallback(() => {
    if (!contentRef.current) return;
    const details = contentRef.current.querySelectorAll("details");
    details.forEach((d) => d.setAttribute("open", ""));
  }, []);

  const collapseAll = useCallback(() => {
    if (!contentRef.current) return;
    const details = contentRef.current.querySelectorAll("details");
    details.forEach((d) => d.removeAttribute("open"));
  }, []);

  return (
    <div>
      {/* Expand/Collapse buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={expandAll}
          className="btn-primary flex items-center gap-1.5 !rounded-full !px-4 !py-2 text-xs"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          전체 펼치기
        </button>
        <button
          onClick={collapseAll}
          className="btn-secondary flex items-center gap-1.5 !rounded-full !px-4 !py-2 text-xs"
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
        className="note-content prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
