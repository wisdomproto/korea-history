import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllNoteIds,
  getNoteById,
  getAdjacentNotes,
} from "@/lib/notes";
import { getQuestionsByIds } from "@/lib/data";
import { breadcrumbJsonLd } from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import PrevNextNav from "@/components/PrevNextNav";
import NoteContent from "./NoteContent";

interface Props {
  params: Promise<{ noteId: string }>;
}

export async function generateStaticParams() {
  return getAllNoteIds().map((id) => ({ noteId: id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { noteId } = await params;
  const note = getNoteById(noteId);
  if (!note) return {};

  const title = `${note.title} - ${note.eraLabel} 요약노트`;
  const description = `한국사능력검정시험 ${note.eraLabel} - ${note.title}. 핵심 정리와 관련 기출 ${note.relatedQuestionIds.length}문제.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "한국사기출",
    },
  };
}

export default async function NotePage({ params }: Props) {
  const { noteId } = await params;
  const note = getNoteById(noteId);
  if (!note) notFound();

  const { prev, next } = getAdjacentNotes(noteId);

  // Get sample related questions (first 20) — uses cached bulk lookup
  const relatedQuestions = getQuestionsByIds(
    note.relatedQuestionIds.slice(0, 20)
  );

  const breadcrumbs = [
    { name: "홈", href: "/" },
    { name: "요약노트", href: "/notes" },
    { name: note.title, href: `/notes/${noteId}` },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)),
        }}
      />

      <BreadCrumb
        items={[
          { label: "요약노트", href: "/notes" },
          { label: note.eraLabel, href: "/notes" },
          { label: note.title },
        ]}
      />

      <h1 className="text-xl font-extrabold text-slate-900 mb-1">{note.title}</h1>
      <div className="mb-5 flex gap-2 text-xs">
        <span className="rounded-full bg-indigo-500 px-2.5 py-0.5 text-white font-semibold">
          {note.eraLabel}
        </span>
        {note.relatedQuestionIds.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 font-medium">
            관련 기출 {note.relatedQuestionIds.length}문제
          </span>
        )}
      </div>

      {/* Note content with expand/collapse */}
      <NoteContent html={note.content} />

      {/* Ad placeholder 1 - mid content */}
      <div className="ad-placeholder my-5" data-ad-slot="note-mid">
        광고 영역
      </div>

      {/* Related questions */}
      {relatedQuestions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <span className="text-base">📝</span>
            관련 기출문제 ({note.relatedQuestionIds.length}문제)
          </h2>
          <div className="space-y-1.5">
            {relatedQuestions.map((q) =>
              q ? (
                <Link
                  key={`${q.examNumber}-${q.questionNumber}`}
                  href={`/exam/${q.examNumber}/${q.questionNumber}`}
                  className="card card-interactive flex items-center justify-between !rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-xs font-medium text-slate-400">
                      {q.examNumber}회 {q.questionNumber}번
                    </span>
                    <span className="text-slate-700 line-clamp-1">
                      {q.content}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">
                    {q.points}점
                  </span>
                </Link>
              ) : null
            )}
            {note.relatedQuestionIds.length > 20 && (
              <p className="text-center text-xs text-slate-400 mt-2">
                외 {note.relatedQuestionIds.length - 20}문제 더
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ad placeholder 2 - bottom */}
      <div className="ad-placeholder my-5" data-ad-slot="note-bottom">
        광고 영역
      </div>

      <PrevNextNav
        prev={
          prev ? { href: `/notes/${prev.id}`, label: prev.title } : undefined
        }
        next={
          next ? { href: `/notes/${next.id}`, label: next.title } : undefined
        }
        center={{ href: "/notes", label: "전체 노트" }}
      />
    </div>
  );
}
