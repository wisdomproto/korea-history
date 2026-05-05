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
 *   left  → QuestionWithTracking (~1fr)
 *   right → RelatedNotePanel (360px, sticky)
 *
 * Mobile: only QuestionWithTracking renders (panel hidden via lg:block).
 * In-card relatedNotes link inside QuestionCard stays as the mobile fallback.
 */
export default function QuestionWithRelatedPanel({
  question,
  exam,
  youtube,
  relatedNotes,
  noteContents,
}: Props) {
  const [answered, setAnswered] = useState(false);
  const hasNotes = (noteContents ?? []).length > 0;

  return (
    <div
      className={
        hasNotes
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 xl:gap-8"
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
      </div>
      {hasNotes && (
        <RelatedNotePanel noteContents={noteContents!} visible={answered} />
      )}
    </div>
  );
}
