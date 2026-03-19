"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface KeywordItem {
  keyword: string;
  era: string;
  count: number;
  questionIds: number[];
}

type SortMode = "era" | "alpha" | "count";

const ERA_ORDER = [
  "선사·고조선", "삼국", "남북국", "고려",
  "조선 전기", "조선 후기", "근대", "현대",
];

const ERA_DOT_COLORS: Record<string, string> = {
  "선사·고조선": "bg-violet-500",
  삼국: "bg-blue-500",
  남북국: "bg-cyan-500",
  고려: "bg-emerald-500",
  "조선 전기": "bg-amber-500",
  "조선 후기": "bg-orange-500",
  근대: "bg-red-500",
  현대: "bg-pink-500",
};

const ERA_COLORS: Record<string, string> = {
  "선사·고조선": "text-violet-600",
  삼국: "text-blue-600",
  남북국: "text-cyan-600",
  고려: "text-emerald-600",
  "조선 전기": "text-amber-600",
  "조선 후기": "text-orange-600",
  근대: "text-red-600",
  현대: "text-pink-600",
};

const SORT_TABS: { key: SortMode; label: string }[] = [
  { key: "count", label: "문항수" },
  { key: "era", label: "시대별" },
  { key: "alpha", label: "가나다" },
];

export default function KeywordList({ keywords }: { keywords: KeywordItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("count");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return keywords;
    return keywords.filter((k) => k.keyword.includes(search));
  }, [keywords, search]);

  const sections = useMemo(() => {
    if (sortMode === "era") {
      const groups: Record<string, KeywordItem[]> = {};
      for (const era of ERA_ORDER) groups[era] = [];
      groups["기타"] = [];
      for (const kw of filtered) {
        if (groups[kw.era]) groups[kw.era].push(kw);
        else groups["기타"].push(kw);
      }
      return ERA_ORDER
        .filter((era) => groups[era].length > 0)
        .map((era) => ({ title: era, data: groups[era].sort((a, b) => a.keyword.localeCompare(b.keyword, "ko")) }))
        .concat(groups["기타"].length > 0 ? [{ title: "기타", data: groups["기타"] }] : []);
    }
    if (sortMode === "alpha") {
      return [{ title: "가나다순", data: [...filtered].sort((a, b) => a.keyword.localeCompare(b.keyword, "ko")) }];
    }
    return [{ title: "문항수순", data: [...filtered].sort((a, b) => b.count - a.count) }];
  }, [filtered, sortMode]);

  const toggleKeyword = (keyword: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const selectedCount = useMemo(() => {
    const ids = new Set<number>();
    for (const kw of keywords) {
      if (selected.has(kw.keyword)) {
        for (const id of kw.questionIds) ids.add(id);
      }
    }
    return ids.size;
  }, [selected, keywords]);

  const handleStart = () => {
    if (selectedCount === 0) return;
    const ids = new Set<number>();
    for (const kw of keywords) {
      if (selected.has(kw.keyword)) {
        for (const id of kw.questionIds) ids.add(id);
      }
    }
    const shuffled = [...ids].sort(() => Math.random() - 0.5).slice(0, 100);
    sessionStorage.setItem("studySession", JSON.stringify({
      ids: shuffled,
      title: `키워드 학습 (${selected.size}개)`,
      totalAvailable: ids.size,
    }));
    router.push("/study/session");
  };

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 card-shadow mb-3">
        <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="키워드 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-2 mb-4">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSortMode(tab.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              sortMode === tab.key
                ? "bg-indigo-500 text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 font-medium">
          {selected.size > 0 ? `${selected.size}개 선택` : `${filtered.length}개`}
        </span>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} className="mb-4">
          <div className="flex items-center gap-2 py-2 px-1">
            <div className={`h-2.5 w-2.5 rounded-full ${ERA_DOT_COLORS[section.title] || "bg-slate-400"}`} />
            <span className="text-sm font-bold text-slate-800">{section.title}</span>
            <span className="text-xs text-slate-400">{section.data.length}개</span>
          </div>

          <div className="space-y-1.5">
            {section.data.map((kw) => {
              const isSelected = selected.has(kw.keyword);
              return (
                <button
                  key={kw.keyword}
                  onClick={() => toggleKeyword(kw.keyword)}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-left ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-indigo-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-300"
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[15px] font-semibold text-slate-900 truncate">{kw.keyword}</span>
                    <span className={`text-[11px] font-medium shrink-0 ${ERA_COLORS[kw.era] || "text-slate-400"}`}>
                      {kw.era}
                    </span>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 shrink-0 ml-2">
                    {kw.count}문항
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-400">검색 결과가 없습니다</p>
        </div>
      )}

      {/* Sticky bottom bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 mt-4 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-white via-white to-transparent">
          <button
            onClick={handleStart}
            className="w-full btn-primary rounded-2xl py-4 text-[15px] font-black"
          >
            선택한 {selectedCount > 100 ? "100" : selectedCount}문제 풀기
            {selectedCount > 100 ? ` (${selectedCount}문제 중 랜덤)` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
