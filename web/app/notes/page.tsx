import Link from "next/link";
import { Metadata } from "next";
import { getNotesGroupedBySection } from "@/lib/notes";

export const metadata: Metadata = {
  title: "요약노트 - 시대별 한국사 핵심 정리",
  description:
    "한국사능력검정시험 시대별 핵심 요약노트. 선사시대부터 현대까지 87개 주제별 정리.",
};

const SECTION_META: Record<string, { color: string; dotColor: string; bgColor: string }> = {
  s1: { color: "border-l-violet-500", dotColor: "bg-violet-500", bgColor: "bg-violet-50/50" },
  s2: { color: "border-l-blue-500", dotColor: "bg-blue-500", bgColor: "bg-blue-50/50" },
  s3: { color: "border-l-cyan-500", dotColor: "bg-cyan-500", bgColor: "bg-cyan-50/50" },
  s4: { color: "border-l-emerald-500", dotColor: "bg-emerald-500", bgColor: "bg-emerald-50/50" },
  s5: { color: "border-l-amber-500", dotColor: "bg-amber-500", bgColor: "bg-amber-50/50" },
  s6: { color: "border-l-orange-500", dotColor: "bg-orange-500", bgColor: "bg-orange-50/50" },
  s7: { color: "border-l-red-500", dotColor: "bg-red-500", bgColor: "bg-red-50/50" },
};

export default function NotesPage() {
  const grouped = getNotesGroupedBySection();
  const sectionOrder = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">요약노트</h1>
      <p className="text-slate-500 text-[13px] mb-5">
        시대별 핵심 정리 &middot; 87개 주제
      </p>

      {sectionOrder.map((sectionId) => {
        const notes = grouped[sectionId];
        if (!notes || notes.length === 0) return null;
        const meta = SECTION_META[sectionId] || { color: "border-l-slate-300", dotColor: "bg-slate-400", bgColor: "bg-slate-50" };
        const eraLabel = notes[0].eraLabel;

        return (
          <section key={sectionId} className="mb-6">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className={`h-3 w-3 rounded-full ${meta.dotColor}`} />
              <h2 className="text-base font-bold text-slate-800">
                {eraLabel}
              </h2>
              <span className="text-xs text-slate-400">{notes.length}개</span>
            </div>

            <div className="space-y-1.5">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className={`flex items-center justify-between rounded-2xl border-l-4 bg-white p-4 card-shadow hover:card-shadow-md transition-all ${meta.color}`}
                >
                  <span className="font-semibold text-sm text-slate-800">{note.title}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {note.questionCount > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                        기출 {note.questionCount}
                      </span>
                    )}
                    <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
