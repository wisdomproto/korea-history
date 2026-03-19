"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const ERA_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  "선사·고조선": { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
  삼국: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  남북국: { bg: "bg-cyan-50", border: "border-cyan-200", badge: "bg-cyan-100 text-cyan-700" },
  고려: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  "조선 전기": { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700" },
  "조선 후기": { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700" },
  근대: { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" },
  현대: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
};

const CAT_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  정치: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
  경제: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" },
  사회: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  문화: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
};

interface Props {
  eras: string[];
  categories: string[];
  counts: Record<string, Record<string, number>>;
  questionIds: Record<string, Record<string, number[]>>;
  totalByEra: Record<string, number>;
  totalByCategory: Record<string, number>;
}

type Tab = "era" | "category";

export default function CustomSelector({
  eras,
  categories,
  counts,
  questionIds,
  totalByEra,
  totalByCategory,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("era");
  // checked[era][category] = boolean
  const [checked, setChecked] = useState<Record<string, Record<string, boolean>>>(() => {
    const init: Record<string, Record<string, boolean>> = {};
    for (const era of eras) {
      init[era] = {};
      for (const cat of categories) {
        init[era][cat] = false;
      }
    }
    return init;
  });

  const toggleCell = (era: string, cat: string) => {
    setChecked((prev) => ({
      ...prev,
      [era]: { ...prev[era], [cat]: !prev[era][cat] },
    }));
  };

  const toggleEraAll = (era: string) => {
    const allChecked = categories.every((cat) => checked[era][cat]);
    setChecked((prev) => ({
      ...prev,
      [era]: Object.fromEntries(categories.map((cat) => [cat, !allChecked])),
    }));
  };

  const toggleCategoryAll = (cat: string) => {
    const allChecked = eras.every((era) => checked[era][cat]);
    setChecked((prev) => {
      const next = { ...prev };
      for (const era of eras) {
        next[era] = { ...next[era], [cat]: !allChecked };
      }
      return next;
    });
  };

  const selectAll = () => {
    setChecked((prev) => {
      const next: Record<string, Record<string, boolean>> = {};
      for (const era of eras) {
        next[era] = {};
        for (const cat of categories) {
          next[era][cat] = true;
        }
      }
      return next;
    });
  };

  const deselectAll = () => {
    setChecked((prev) => {
      const next: Record<string, Record<string, boolean>> = {};
      for (const era of eras) {
        next[era] = {};
        for (const cat of categories) {
          next[era][cat] = false;
        }
      }
      return next;
    });
  };

  // Compute selected question IDs
  const selectedIds = useMemo(() => {
    const ids: number[] = [];
    for (const era of eras) {
      for (const cat of categories) {
        if (checked[era][cat]) {
          ids.push(...questionIds[era][cat]);
        }
      }
    }
    return ids;
  }, [checked, eras, categories, questionIds]);

  const selectedCount = selectedIds.length;

  const handleStart = () => {
    if (selectedCount === 0) return;
    // Shuffle
    const shuffled = [...selectedIds].sort(() => Math.random() - 0.5);
    // Limit to 100 for performance
    const limited = shuffled.slice(0, 100);
    sessionStorage.setItem("studySession", JSON.stringify({
      ids: limited,
      title: "맞춤형 학습",
      totalAvailable: selectedCount,
    }));
    router.push("/study/session");
  };

  // Era tab: each era card with category checkboxes
  const renderEraTab = () => (
    <div className="space-y-3">
      {eras.map((era) => {
        const color = ERA_COLORS[era] || ERA_COLORS["현대"];
        const eraTotal = totalByEra[era] || 0;
        const eraCheckedCount = categories.reduce(
          (sum, cat) => sum + (checked[era][cat] ? counts[era][cat] : 0), 0
        );
        const allChecked = categories.every((cat) => checked[era][cat]);

        return (
          <div key={era} className={`rounded-2xl border ${color.border} ${color.bg} overflow-hidden`}>
            <button
              onClick={() => toggleEraAll(era)}
              className="w-full flex items-center gap-3 px-4 py-3"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                allChecked ? "bg-indigo-500 border-indigo-500" : "border-slate-300 bg-white"
              }`}>
                {allChecked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-[15px] font-bold text-slate-800">{era}</span>
              <span className={`ml-auto rounded-lg px-2 py-0.5 text-[11px] font-bold ${color.badge}`}>
                {eraCheckedCount > 0 ? `${eraCheckedCount}/${eraTotal}` : eraTotal}문제
              </span>
            </button>
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {categories.map((cat) => {
                const count = counts[era][cat];
                const isChecked = checked[era][cat];
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCell(era, cat)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      isChecked
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-white/70 text-slate-500 hover:bg-white"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[11px] ${isChecked ? "text-indigo-200" : "text-slate-300"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Category tab: each category card with era checkboxes
  const renderCategoryTab = () => (
    <div className="space-y-3">
      {categories.map((cat) => {
        const color = CAT_COLORS[cat] || CAT_COLORS["정치"];
        const catTotal = totalByCategory[cat] || 0;
        const catCheckedCount = eras.reduce(
          (sum, era) => sum + (checked[era][cat] ? counts[era][cat] : 0), 0
        );
        const allChecked = eras.every((era) => checked[era][cat]);

        return (
          <div key={cat} className={`rounded-2xl border ${color.border} ${color.bg} overflow-hidden`}>
            <button
              onClick={() => toggleCategoryAll(cat)}
              className="w-full flex items-center gap-3 px-4 py-3"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                allChecked ? "bg-indigo-500 border-indigo-500" : "border-slate-300 bg-white"
              }`}>
                {allChecked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-[15px] font-bold text-slate-800">{cat}</span>
              <span className={`ml-auto rounded-lg px-2 py-0.5 text-[11px] font-bold ${color.badge}`}>
                {catCheckedCount > 0 ? `${catCheckedCount}/${catTotal}` : catTotal}문제
              </span>
            </button>
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {eras.map((era) => {
                const count = counts[era][cat];
                const isChecked = checked[era][cat];
                return (
                  <button
                    key={era}
                    onClick={() => toggleCell(era, cat)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      isChecked
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-white/70 text-slate-500 hover:bg-white"
                    }`}
                  >
                    <span>{era}</span>
                    <span className={`text-[11px] ${isChecked ? "text-indigo-200" : "text-slate-300"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl bg-slate-100/80 p-1.5 mb-4">
        <button
          onClick={() => setTab("era")}
          className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-all ${
            tab === "era" ? "bg-white text-slate-800 shadow-sm card-shadow" : "text-slate-400"
          }`}
        >
          시대별
        </button>
        <button
          onClick={() => setTab("category")}
          className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-all ${
            tab === "category" ? "bg-white text-slate-800 shadow-sm card-shadow" : "text-slate-400"
          }`}
        >
          유형별
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-3">
        <button onClick={selectAll} className="text-xs font-semibold text-indigo-500 hover:text-indigo-600">
          전체 선택
        </button>
        <span className="text-xs text-slate-300">|</span>
        <button onClick={deselectAll} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
          전체 해제
        </button>
      </div>

      {/* Content */}
      {tab === "era" ? renderEraTab() : renderCategoryTab()}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 mt-4 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={handleStart}
          disabled={selectedCount === 0}
          className={`w-full rounded-2xl py-4 text-[15px] font-black transition-all ${
            selectedCount > 0
              ? "btn-primary"
              : "bg-slate-100 text-slate-300 cursor-not-allowed"
          }`}
        >
          {selectedCount > 0
            ? `선택한 ${selectedCount > 100 ? "100" : selectedCount}문제 풀기${selectedCount > 100 ? ` (${selectedCount}문제 중 랜덤)` : ""}`
            : "문제를 선택하세요"}
        </button>
      </div>
    </div>
  );
}
