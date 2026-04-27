import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllNoteIds,
  getNoteById,
  getAdjacentNotes,
  getSectionNotes,
} from "@/lib/notes";
import { getNoteLectures } from "@/lib/note-lectures";
import { breadcrumbJsonLd } from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import PrevNextNav from "@/components/PrevNextNav";
import NoteContent from "./NoteContent";
import NoteActions from "./NoteActions";
import AdSlot from "@/components/AdSlot";
import ShareButtons from "@/components/ShareButtons";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { NoteIntro, NoteOutro } from "@/components/NoteSEOContent";

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

  const title = `${note.title} 요약정리 - 한능검 필수 암기`;
  const description = `한능검 ${note.eraLabel} - ${note.title} 핵심 요약. 관련 기출 ${note.relatedQuestionIds.length}문제, 영상강의 포함.`;

  const path = `/notes/${noteId}`;
  const keywords = [
    "한능검",
    "한국사능력검정시험",
    "요약노트",
    "한국사 요약",
    note.eraLabel,
    note.title,
    `${note.title} 요약`,
    `${note.title} 정리`,
    `한능검 ${note.eraLabel}`,
  ];
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
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

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${note.title} 요약정리 - 한능검 필수 암기`,
    description: `한능검 ${note.eraLabel} - ${note.title} 핵심 요약. 관련 기출 ${note.relatedQuestionIds.length}문제, 영상강의 포함.`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/notes/${noteId}`,
    },
    about: [
      { "@type": "Thing", name: "한국사능력검정시험" },
      { "@type": "Thing", name: note.eraLabel },
      { "@type": "Thing", name: note.title },
    ],
    inLanguage: "ko",
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: "기출노트 한능검",
      url: SITE_URL,
    },
    educationalLevel: "한국사능력검정시험",
    learningResourceType: "요약노트",
  };
  const videoJsonLd = lectures.length
    ? lectures.map((lec) => ({
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `${note.title} 강의 - ${lec.title}`,
        description: `한능검 ${note.eraLabel} ${note.title} 영상 강의`,
        thumbnailUrl: `https://i.ytimg.com/vi/${lec.videoId}/hqdefault.jpg`,
        uploadDate: "2024-01-01",
        duration: `PT${Math.floor(lec.duration / 60)}M${lec.duration % 60}S`,
        embedUrl: `https://www.youtube.com/embed/${lec.videoId}`,
        contentUrl: `https://www.youtube.com/watch?v=${lec.videoId}`,
        inLanguage: "ko",
      }))
    : [];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {videoJsonLd.map((v, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(v) }}
        />
      ))}

      <BreadCrumb
        items={[
          { label: "요약노트", href: "/notes" },
          { label: note.eraLabel, href: "/notes" },
          { label: note.title },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{note.title}</h1>
        <div className="shrink-0">
          <ShareButtons
            title={`${note.title} — 한능검 요약노트`}
            description={`${note.eraLabel} 핵심 요약 | 관련 기출 ${note.relatedQuestionIds.length}문제`}
            buttonText="요약노트 보기"
          />
        </div>
      </div>
      <div className="mb-5 flex gap-2 text-xs">
        <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-white font-semibold">
          {note.eraLabel}
        </span>
        {note.relatedQuestionIds.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600 font-medium">
            관련 기출 {note.relatedQuestionIds.length}문제
          </span>
        )}
      </div>

      {/* Server-rendered intro (SEO) — describes section context */}
      <NoteIntro sectionId={note.sectionId} noteTitle={note.title} />

      {/* Note content with expand/collapse */}
      <NoteContent html={note.content} />

      {/* Server-rendered outro (SEO) — study guide, exam frequency, sibling notes */}
      <NoteOutro
        sectionId={note.sectionId}
        noteTitle={note.title}
        relatedNotes={getSectionNotes(note.sectionId, note.id, 8)}
        relatedQuestionCount={note.relatedQuestionIds.length}
      />

      {/* Lecture videos */}
      {lectures.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/>
            </svg>
            관련 강의
          </h2>
          <div className="space-y-3">
            {lectures.map((lec, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-200/80 bg-white">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <YouTubeEmbed
                    className="absolute inset-0 w-full h-full"
                    videoId={lec.videoId}
                    title={lec.title}
                    context={{
                      surface: "note",
                      note_id: noteId,
                      section_id: note.sectionId,
                      lecture_index: i,
                    }}
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

      {/* Ad: after lectures or after content */}
      <AdSlot size="rectangle" slot={process.env.NEXT_PUBLIC_AD_SLOT_NOTE} className="my-6" />

      {/* Related questions — study session button */}
      <NoteActions
        questionIds={note.relatedQuestionIds}
        noteTitle={note.title}
      />

      {/* Ad: NoteActions 직후 — 노트 학습 + 관련 문제 둘러본 후 두번째 광고 */}
      <AdSlot size="rectangle" slot={process.env.NEXT_PUBLIC_AD_SLOT_NOTE_BOTTOM} className="my-6" />

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
