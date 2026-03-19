import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllNoteIds,
  getNoteById,
  getAdjacentNotes,
} from "@/lib/notes";
import { getNoteLectures } from "@/lib/note-lectures";
import { breadcrumbJsonLd } from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import PrevNextNav from "@/components/PrevNextNav";
import NoteContent from "./NoteContent";
import NoteActions from "./NoteActions";

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

  const lectures = getNoteLectures(noteId);

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

      {/* Lecture videos */}
      {lectures.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/>
            </svg>
            관련 강의
            <span className="text-xs font-normal text-slate-400">최태성 1TV</span>
          </h2>
          <div className="space-y-2">
            {lectures.map((lec, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${lec.videoId}?rel=0`}
                    title={lec.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{lec.title}</span>
                  <span className="text-xs text-slate-400">{Math.floor(lec.duration / 60)}분</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad placeholder */}
      <div className="ad-placeholder my-5" data-ad-slot="note-mid">
        광고 영역
      </div>

      {/* Related questions — study session button */}
      <NoteActions
        questionIds={note.relatedQuestionIds}
        noteTitle={note.title}
      />

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
