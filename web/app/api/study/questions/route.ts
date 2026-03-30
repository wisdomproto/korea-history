import { NextRequest, NextResponse } from "next/server";
import { getFullQuestionsByIds } from "@/lib/data";
import { getYouTubeTimestamp } from "@/lib/youtube";
import { getRelatedNotesForQuestions } from "@/lib/notes";

// POST /api/study/questions — get full questions by IDs
export async function POST(req: NextRequest) {
  const body = await req.json();
  const ids: number[] = body.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  // Limit to 200 questions per session
  const limited = ids.slice(0, 200);
  const results = getFullQuestionsByIds(limited);

  const questionIds = results.map(({ question }) => question.id);
  const notesMap = getRelatedNotesForQuestions(questionIds);

  const questions = results.map(({ question, examNumber }) => ({
    ...question,
    examNumber,
    youtube: getYouTubeTimestamp(examNumber, question.questionNumber),
    relatedNotes: notesMap[question.id] || [],
  }));

  return NextResponse.json({ questions });
}
