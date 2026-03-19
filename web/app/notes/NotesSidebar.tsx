"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NoteItem {
  id: string;
  title: string;
  eraLabel: string;
  sectionId: string;
  questionCount: number;
}

interface SectionMeta {
  dotColor: string;
  borderColor: string;
}

const SECTION_META: Record<string, SectionMeta> = {
  s1: { dotColor: "bg-violet-500", borderColor: "border-l-violet-500" },
  s2: { dotColor: "bg-blue-500", borderColor: "border-l-blue-500" },
  s3: { dotColor: "bg-cyan-500", borderColor: "border-l-cyan-500" },
  s4: { dotColor: "bg-emerald-500", borderColor: "border-l-emerald-500" },
  s5: { dotColor: "bg-amber-500", borderColor: "border-l-amber-500" },
  s6: { dotColor: "bg-orange-500", borderColor: "border-l-orange-500" },
  s7: { dotColor: "bg-red-500", borderColor: "border-l-red-500" },
};

const SECTION_ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];

interface Props {
  notes: NoteItem[];
  grouped: Record<string, NoteItem[]>;
}

export default function NotesSidebar({ notes, grouped }: Props) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    return notes.filter((n) =>
      n.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [notes, search]);

  const displayGroups = useMemo(() => {
    if (filtered) {
      // Group filtered results
      const g: Record<string, NoteItem[]> = {};
      for (const n of filtered) {
        if (!g[n.sectionId]) g[n.sectionId] = [];
        g[n.sectionId].push(n);
      }
      return g;
    }
    return grouped;
  }, [filtered, grouped]);

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 mb-3">
        <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="노트 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Note list */}
      <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto hide-scrollbar">
        {SECTION_ORDER.map((sectionId) => {
          const sectionNotes = displayGroups[sectionId];
          if (!sectionNotes || sectionNotes.length === 0) return null;
          const meta = SECTION_META[sectionId] || SECTION_META.s1;
          const eraLabel = sectionNotes[0].eraLabel;

          return (
            <div key={sectionId}>
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <div className={`h-2 w-2 rounded-full ${meta.dotColor}`} />
                <span className="text-[11px] font-bold text-slate-600">{eraLabel}</span>
              </div>
              <div className="space-y-1">
                {sectionNotes.map((note) => {
                  const isActive = pathname === `/notes/${note.id}`;
                  return (
                    <Link
                      key={note.id}
                      href={`/notes/${note.id}`}
                      className={`block rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-amber-100 to-yellow-50 text-amber-900 font-bold shadow-sm border border-amber-200/60"
                          : "bg-white/60 text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent"
                      }`}
                    >
                      {note.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered && filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">검색 결과가 없습니다</p>
        )}
      </div>
    </div>
  );
}
