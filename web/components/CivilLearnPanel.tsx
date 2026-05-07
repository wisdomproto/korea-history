"use client";

import { useState } from "react";
import { Question, Exam } from "@/lib/types";
import QuestionWithTracking from "./QuestionWithTracking";
import NoteDrawer, { type NoteContent } from "./NoteDrawer";
import type { RelatedNoteLink } from "./QuestionCard";

interface Props {
  question: Question;
  exam: Exam;
  relatedNotes?: RelatedNoteLink[];
  noteContents?: NoteContent[];
  /** Civil topic embedded CSS (cream/amber design tokens) — single style for all topics. */
  noteStyleCSS?: string;
  /** examSlug + subjectSlug for "전체 노트 페이지로" link. */
  notesIndexHref?: string;
}

/**
 * 공무원/자격증 시험용 학습 패널 — QuestionWithRelatedPanel(한능검) 구조 그대로,
 * 공무원 단원 styling 시스템에 맞춰 NoteDrawer extraCSS 활용.
 * Phase 1: 관련 단원 drawer만. SEO 학습자료는 별도 (era/category context 데이터 필요).
 */
export default function CivilLearnPanel({
  question,
  exam,
  relatedNotes,
  noteContents,
  noteStyleCSS,
  notesIndexHref,
}: Props) {
  const [answered, setAnswered] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasNotes = (noteContents ?? []).length > 0;

  return (
    <>
      <QuestionWithTracking
        question={question}
        exam={exam}
        relatedNotes={relatedNotes}
        onAnswered={() => setAnswered(true)}
        hideRelatedNotes={hasNotes}
      />

      {/* 정답 후: 통합 학습 박스 (단원 drawer trigger) */}
      {answered && hasNotes && (
        <section
          className="mt-6 rounded-2xl border border-amber-200/60 bg-white shadow-sm overflow-hidden"
          aria-label="더 학습하기"
        >
          <header className="px-5 py-3 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🎓</span>
              <h3 className="font-bold text-slate-900 text-[15px]">더 학습하기</h3>
            </div>
          </header>

          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/40 transition-colors text-left"
            aria-label="관련 단원 펼치기"
          >
            <span className="text-xl shrink-0">📝</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-[14px]">
                관련 단원 ({(noteContents ?? []).length}편)
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                이 문제와 매칭되는 핵심 단원
              </div>
            </div>
            <svg
              className="w-4 h-4 text-amber-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </section>
      )}

      {/* Drawer */}
      {hasNotes && (
        <NoteDrawer
          noteContents={noteContents!}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          extraCSS={noteStyleCSS}
          fullPageHref={
            notesIndexHref
              ? (note) => `${notesIndexHref}#topic-${note.sectionId}`
              : undefined
          }
        />
      )}
    </>
  );
}
