"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import NotesSidebar from "./NotesSidebar";

interface NoteItem {
  id: string;
  title: string;
  eraLabel: string;
  sectionId: string;
  questionCount: number;
}

interface Props {
  notes: NoteItem[];
  grouped: Record<string, NoteItem[]>;
  children: React.ReactNode;
}

export default function NotesLayout({ notes, grouped, children }: Props) {
  const pathname = usePathname();
  const isDetailPage = pathname !== "/notes" && pathname.startsWith("/notes/");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On the list page, just render children (no sidebar needed)
  if (!isDetailPage) {
    return <>{children}</>;
  }

  // On detail pages, show sidebar
  return (
    <div className="md:flex md:gap-5 md:-mx-4 md:px-4">
      {/* Desktop sidebar */}
      <aside className="hidden md:block md:w-64 md:shrink-0">
        <div className="sticky top-16">
          <NotesSidebar notes={notes} grouped={grouped} />
        </div>
      </aside>

      {/* Mobile toggle */}
      <div className="md:hidden mb-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          다른 노트 보기
          <svg className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${sidebarOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {sidebarOpen && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 card-shadow animate-fade-in">
            <NotesSidebar notes={notes} grouped={grouped} />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="md:flex-1 md:min-w-0">
        {children}
      </div>
    </div>
  );
}
