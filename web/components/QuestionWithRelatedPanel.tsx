"use client";

import { useState } from "react";
import { Question, Exam } from "@/lib/types";
import QuestionWithTracking from "./QuestionWithTracking";
import RelatedNotePanel, { type NoteContent } from "./RelatedNotePanel";
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
 * Tablet/desktop split layout (lg+):
 *   기본 → 문제만 풀스크린 (집중)
 *   정답 후 → 카드 아래 amber CTA "관련 요약노트 펼치기" 버튼 등장
 *   사용자 클릭 → 좌(40%) 문제 + 우(60%) 노트 패널 split (학습 모드)
 *   패널 닫기 → 다시 풀스크린 문제로 복귀
 *
 * Mobile: 항상 풀스크린 문제만 (RelatedNotePanel은 lg:block, 카드 내 기존 link 폴백)
 */
export default function QuestionWithRelatedPanel({
  question,
  exam,
  youtube,
  relatedNotes,
  noteContents,
}: Props) {
  const [answered, setAnswered] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const hasNotes = (noteContents ?? []).length > 0;
  const showSplit = panelOpen && hasNotes;

  return (
    <div
      className={
        showSplit
          ? "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6 xl:gap-8"
          : ""
      }
    >
      <div className="min-w-0">
        <QuestionWithTracking
          question={question}
          exam={exam}
          youtube={youtube}
          relatedNotes={relatedNotes}
          onAnswered={() => setAnswered(true)}
        />

        {/* 정답 후 + 패널 닫힘 (lg+ 만): 토글 CTA */}
        {answered && hasNotes && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="hidden lg:flex w-full items-center justify-center gap-3 mt-6 py-4 rounded-2xl text-white font-bold text-base transition-all"
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
      </div>

      {showSplit && (
        <RelatedNotePanel
          noteContents={noteContents!}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
