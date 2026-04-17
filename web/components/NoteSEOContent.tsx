import Link from "next/link";
import { NOTE_SECTION_CONTEXT } from "@/lib/note-section-context";

interface RelatedNote {
  id: string;
  title: string;
}

interface Props {
  sectionId: string;
  noteTitle: string;
  relatedNotes: RelatedNote[];
  relatedQuestionCount: number;
}

/**
 * Server-rendered SEO intro/outro for note pages. Ensures every note has
 * substantial unique narrative content — covers even the shortest notes
 * (200~300 chars) by wrapping them with a 500~700 char section overview
 * plus a study guide and related-notes links.
 */
export function NoteIntro({ sectionId, noteTitle }: { sectionId: string; noteTitle: string }) {
  const ctx = NOTE_SECTION_CONTEXT[sectionId];
  if (!ctx) return null;
  return (
    <section className="mb-5 rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5 card-shadow text-[13px] leading-[1.75] text-slate-600 space-y-2">
      <p>
        <strong className="text-slate-800">&lsquo;{noteTitle}&rsquo;</strong>은(는) 한능검{" "}
        <strong>{ctx.label} ({ctx.period})</strong> 단원에 속하는 주제 노트입니다. {ctx.intro}
      </p>
    </section>
  );
}

export function NoteOutro({ sectionId, relatedNotes, relatedQuestionCount }: Props) {
  const ctx = NOTE_SECTION_CONTEXT[sectionId];
  if (!ctx) return null;
  return (
    <section className="mt-8 space-y-4 text-[13px] leading-[1.75] text-slate-600">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 card-shadow">
        <h2 className="text-sm font-black text-slate-900 mb-2">
          {ctx.label} 학습 가이드
        </h2>
        <p>{ctx.studyGuide}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 card-shadow">
        <h2 className="text-sm font-black text-slate-900 mb-2">
          이 단원의 시험 출제 경향
        </h2>
        <p>{ctx.examFrequency}</p>
        {relatedQuestionCount > 0 && (
          <p className="mt-2 text-slate-500">
            이 노트와 직접 연계된 기출은 <strong>{relatedQuestionCount}문제</strong>이며, 노트 하단의
            &lsquo;관련 기출 풀기&rsquo; 버튼으로 바로 학습 세션을 시작할 수 있습니다.
          </p>
        )}
      </div>

      {relatedNotes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 card-shadow">
          <h2 className="text-sm font-black text-slate-900 mb-2">
            같은 단원의 다른 요약노트
          </h2>
          <ul className="space-y-1.5">
            {relatedNotes.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/notes/${n.id}`}
                  className="text-[13px] text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  · {n.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
