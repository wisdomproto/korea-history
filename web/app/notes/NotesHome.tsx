"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

interface NoteItem {
  id: string;
  title: string;
  eraLabel: string;
  sectionId: string;
  questionCount: number;
}

const SECTION_META: Record<string, { color: string; dotColor: string }> = {
  s1: { color: "border-l-violet-500", dotColor: "bg-violet-500" },
  s2: { color: "border-l-blue-500", dotColor: "bg-blue-500" },
  s3: { color: "border-l-cyan-500", dotColor: "bg-cyan-500" },
  s4: { color: "border-l-emerald-500", dotColor: "bg-emerald-500" },
  s5: { color: "border-l-amber-500", dotColor: "bg-amber-500" },
  s6: { color: "border-l-orange-500", dotColor: "bg-orange-500" },
  s7: { color: "border-l-red-500", dotColor: "bg-red-500" },
};

const SECTION_ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];

interface Props {
  notes: NoteItem[];
  grouped: Record<string, NoteItem[]>;
}

export default function NotesHome({ notes, grouped }: Props) {
  const [search, setSearch] = useState("");

  const displayGroups = useMemo(() => {
    if (!search.trim()) return grouped;
    const filtered = notes.filter((n) =>
      n.title.toLowerCase().includes(search.toLowerCase())
    );
    const g: Record<string, NoteItem[]> = {};
    for (const n of filtered) {
      if (!g[n.sectionId]) g[n.sectionId] = [];
      g[n.sectionId].push(n);
    }
    return g;
  }, [notes, grouped, search]);

  const totalFiltered = Object.values(displayGroups).reduce((s, arr) => s + arr.length, 0);

  // Scroll to hash section on mount (e.g., /notes#s1)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          // Brief highlight effect
          el.classList.add("ring-2", "ring-emerald-400", "ring-offset-2", "rounded-2xl");
          setTimeout(() => el.classList.remove("ring-2", "ring-emerald-400", "ring-offset-2", "rounded-2xl"), 2000);
        }
      }, 100);
    }
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">요약노트</h1>
          <p className="text-sm text-gray-400">시대별 핵심 정리 · {notes.length}개 주제</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white px-4 py-3 mb-5">
        <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="노트 검색... (예: 고조선, 임진왜란, 실학)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
        />
        {search && (
          <>
            <span className="text-xs text-slate-400 font-medium shrink-0">{totalFiltered}개</span>
            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Note list */}
      {SECTION_ORDER.map((sectionId) => {
        const sectionNotes = displayGroups[sectionId];
        if (!sectionNotes || sectionNotes.length === 0) return null;
        const meta = SECTION_META[sectionId] || SECTION_META.s1;
        const eraLabel = sectionNotes[0].eraLabel;

        return (
          <section key={sectionId} id={sectionId} className="mb-6 scroll-mt-4 transition-all duration-500">
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className={`h-3 w-3 rounded-full ${meta.dotColor}`} />
              <h2 className="text-base font-bold text-slate-800">{eraLabel}</h2>
              <span className="text-xs text-slate-400">{sectionNotes.length}개</span>
            </div>

            <div className="space-y-1.5">
              {sectionNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className={`flex items-center justify-between rounded-2xl border-l-4 bg-white border border-gray-200/80 px-4 py-4 sm:py-3 hover:shadow-md hover:-translate-y-0.5 transition-all min-h-[52px] ${meta.color}`}
                >
                  <span className="font-semibold text-sm sm:text-sm text-slate-800 leading-snug">{note.title}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {note.questionCount > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 sm:py-0.5 text-[11px] sm:text-[10px] font-bold text-emerald-600">
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

      {totalFiltered === 0 && search && (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-400">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}
