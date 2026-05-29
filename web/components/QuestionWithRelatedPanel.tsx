"use client";

import { useState } from "react";
import { Question, Exam } from "@/lib/types";
import QuestionWithTracking from "./QuestionWithTracking";
import NoteDrawer, { type NoteContent } from "./NoteDrawer";
import YouTubeEmbed from "./YouTubeEmbed";
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
 * Post-answer layout (모든 viewport):
 *   1. QuestionCard (해설 + 광고 — 영상은 외부로 분리, 카드 가벼움)
 *   2. 관련 요약노트 박스 — 📝 → NoteDrawer (slide-in from right)
 *   3. 영상 해설 — 페이지 하단 inline (정답 후만 mount)
 *
 * 정답 전엔 노트 박스/영상 모두 hidden — 문제에만 집중.
 * 학습 자료(시대 배경·해설 등)는 QuestionSEOContent가 page.tsx에서 서버 렌더
 * (정답 무관 비-스포일러 블록은 기본 노출, 정답은 접힘) — 크롤러/리뷰어가 본문 인식.
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
        hideYouTubeInCard
      />

      {/* 정답 후: 관련 요약노트 박스 (drawer trigger) */}
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
            aria-label="관련 요약노트 펼치기"
          >
            <span className="text-xl shrink-0">📝</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-[14px]">
                관련 요약노트 ({(noteContents ?? []).length}편)
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                이 문제 시대의 핵심 단원
              </div>
            </div>
            <svg
              className="w-4 h-4 text-amber-600 shrink-0"
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
        </section>
      )}

      {/* 정답 후: 영상 해설 (페이지 하단 inline) */}
      {answered && youtube && (
        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-md">
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100/50">
            <svg
              className="w-5 h-5 text-red-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
              <path
                d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                fill="white"
              />
            </svg>
            <span className="text-sm font-bold text-slate-700">영상 해설</span>
            <span className="text-xs text-slate-400 ml-auto">
              {youtube.channelName}
            </span>
          </div>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <YouTubeEmbed
              className="absolute inset-0 w-full h-full"
              videoId={youtube.videoId}
              startSeconds={youtube.startSeconds}
              title="영상 해설"
              context={{
                surface: "question",
                question_id: question.id,
                exam_id: question.examId,
                question_number: question.questionNumber,
                channel: youtube.channelName,
              }}
            />
          </div>
        </div>
      )}

      {/* Drawer */}
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
