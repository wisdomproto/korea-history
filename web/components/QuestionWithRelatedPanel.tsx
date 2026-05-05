"use client";

import { useState } from "react";
import { Question, Exam } from "@/lib/types";
import QuestionWithTracking from "./QuestionWithTracking";
import NoteDrawer, { type NoteContent } from "./NoteDrawer";
import type { RelatedNoteLink } from "./QuestionCard";

interface YouTubeData {
  videoId: string;
  startSeconds: number;
  channelName: string;
}

interface Props {
  question: Question;
  exam: Exam;
  youtube?: YouTubeData | null;
  relatedNotes?: RelatedNoteLink[];
  noteContents?: NoteContent[];
}

/**
 * Drawer-driven UX (모든 viewport 일관):
 *   1. 정답 풀고 정답 클릭 → 카드 아래 amber CTA "관련 요약노트 펼치기" 버튼 등장
 *   2. CTA 클릭 → 우측에서 NoteDrawer 슬라이드 인 (모바일은 full-screen)
 *   3. ✕ / ESC / 배경 클릭으로 닫기
 *
 * Page layout 변동 없음 — drawer는 overlay이라 문제 페이지 구조는 그대로 유지.
 *
 * QuestionCard 안의 기존 "관련 요약노트" link 섹션은 noteContents 있을 때 hidden
 * (drawer가 대체). noteContents 없으면 (CBT 등) link 그대로 → 페이지 이동.
 */
export default function QuestionWithRelatedPanel({
  question,
  exam,
  youtube,
  relatedNotes,
  noteContents,
}: Props) {
  const [answered, setAnswered] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasNotes = (noteContents ?? []).length > 0;

  return (
    <>
      <QuestionWithTracking
        question={question}
        exam={exam}
        youtube={youtube}
        relatedNotes={relatedNotes}
        onAnswered={() => setAnswered(true)}
        hideRelatedNotes={hasNotes}
      />

      {/* 정답 후 CTA 버튼 — drawer 토글. 모든 viewport */}
      {answered && hasNotes && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex w-full items-center justify-center gap-3 mt-6 py-4 rounded-2xl text-white font-bold text-base transition-all"
          style={{
            background:
              "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)",
            border: "none",
            cursor: "pointer",
            boxShadow:
              "0 4px 12px rgba(180, 83, 9, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow =
              "0 6px 18px rgba(180, 83, 9, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(180, 83, 9, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)";
          }}
          aria-label="관련 요약노트 펼치기"
        >
          <span className="text-xl">📝</span>
          <span>
            관련 요약노트 펼치기 ({(noteContents ?? []).length}편)
          </span>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {hasNotes && (
        <NoteDrawer
          noteContents={noteContents!}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
