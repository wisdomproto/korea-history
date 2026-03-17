"use client";

import { useState } from "react";
import Link from "next/link";

interface GroupItem {
  label: string;
  count: number;
  color: string;
  questions: { examNumber: number; questionNumber: number; content: string; points: number }[];
  totalCount: number;
}

interface CustomTabsProps {
  eraItems: GroupItem[];
  categoryItems: GroupItem[];
}

type Tab = "era" | "category";

export default function CustomTabs({ eraItems, categoryItems }: CustomTabsProps) {
  const [tab, setTab] = useState<Tab>("era");
  const [expanded, setExpanded] = useState<string | null>(null);

  const items = tab === "era" ? eraItems : categoryItems;

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 rounded-2xl bg-slate-100 p-1">
        <button
          onClick={() => { setTab("era"); setExpanded(null); }}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
            tab === "era"
              ? "bg-white text-indigo-600 card-shadow"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          시대별
        </button>
        <button
          onClick={() => { setTab("category"); setExpanded(null); }}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
            tab === "category"
              ? "bg-white text-indigo-600 card-shadow"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          유형별
        </button>
      </div>

      {/* Group list */}
      <div className="space-y-2">
        {items.map((item) => {
          const isExpanded = expanded === item.label;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white card-shadow overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : item.label)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/50 transition-colors"
              >
                <span className="font-bold text-[15px] text-slate-900">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                    {item.count}문제
                  </span>
                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/30 px-3 pb-3">
                  <div className="space-y-1 mt-2">
                    {item.questions.map((q) => (
                      <Link
                        key={`${q.examNumber}-${q.questionNumber}`}
                        href={`/exam/${q.examNumber}/${q.questionNumber}`}
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors card-shadow"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 text-xs font-medium text-slate-400">
                            {q.examNumber}회 {q.questionNumber}번
                          </span>
                          <span className="text-slate-700 line-clamp-1">
                            {q.content}
                          </span>
                        </div>
                        <span className="shrink-0 ml-2 text-xs text-slate-400">
                          {q.points}점
                        </span>
                      </Link>
                    ))}
                  </div>
                  {item.totalCount > 8 && (
                    <p className="mt-2 text-center text-xs text-slate-400">
                      외 {item.totalCount - 8}문제
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
