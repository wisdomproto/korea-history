"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

interface Topic {
  topicId: string;
  ord: number;
  title: string;
  keywords: string[];
  freq: number;
  chars: number;
  questionCount: number;
}

interface Props {
  examLabel: string;
  examMain: string;
  subjectLabel: string;
  subjectSlug: string;
  noteSlug: string | null; // null = auto guide
  topics: Topic[];
  mode: "manual" | "auto";
  stem?: string;
  meta: {
    totalTopics: number;
    chars?: number;
    totalQ?: number;
    subtitle: string;
  };
}

// 단원 prefix별 색상 (한능검 시대 색상 대신 그룹 색)
const GROUP_COLORS = [
  "border-l-violet-500",
  "border-l-blue-500",
  "border-l-cyan-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-orange-500",
  "border-l-red-500",
  "border-l-pink-500",
  "border-l-purple-500",
  "border-l-teal-500",
];

export default function CivilNotesHome({
  examLabel,
  examMain,
  subjectLabel,
  subjectSlug,
  noteSlug,
  topics,
  mode,
  stem,
  meta,
}: Props) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // 단원을 5개씩 그룹핑 (한능검의 시대 그룹 대신)
  const groups = useMemo(() => {
    const grouped: Record<string, Topic[]> = {};
    const groupSize = 5;
    const total = topics.length;
    topics.forEach((t, idx) => {
      const groupNum = Math.floor(idx / groupSize) + 1;
      const startOrd = (groupNum - 1) * groupSize + 1;
      const endOrd = Math.min(groupNum * groupSize, total);
      const groupKey = `g${groupNum}`;
      const groupLabel = `단원 ${startOrd}~${endOrd}`;
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push({ ...t, _groupLabel: groupLabel } as any);
    });
    return grouped;
  }, [topics]);

  const groupKeys = useMemo(() => Object.keys(groups).sort(), [groups]);

  const filtered = useMemo(() => {
    if (!search.trim()) return topics;
    const q = search.toLowerCase();
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [topics, search]);

  // 단원 URL — manual은 /civil-notes/{slug}/{topicId}, auto는 별도 페이지 X (여기서 inline)
  const topicHref = (topicId: string) =>
    noteSlug ? `/civil-notes/${noteSlug}/${topicId}` : `#topic-${topicId}`;

  function toggleGroup(key: string) {
    setCollapsedGroups((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <main className="bg-[var(--gc-bg)] min-h-[calc(100vh-68px)]">
      <div className="mx-auto max-w-[1200px] px-5 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav className="text-xs text-[var(--gc-ink2)] mb-4 font-mono">
          <Link href="/" className="hover:text-[var(--gc-amber)]">홈</Link>
          <span className="mx-2">›</span>
          <Link href={examMain} className="hover:text-[var(--gc-amber)]">{examLabel}</Link>
          <span className="mx-2">›</span>
          <span className="text-[var(--gc-amber)] font-bold">{subjectLabel} 요약노트</span>
        </nav>

        {/* Header */}
        <header className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)] font-bold mb-2">
            {mode === "manual" ? "Auto Summary Note" : "Auto Study Guide"} · {examLabel}
          </div>
          <h1 className="font-serif-kr text-3xl md:text-4xl font-black text-[var(--gc-ink)] tracking-tight">
            {subjectLabel} <span className="text-[var(--gc-amber)]">요약노트</span>
          </h1>
          <p className="text-sm text-[var(--gc-ink2)] mt-2">
            {meta.subtitle} · {meta.totalTopics}단원
            {meta.chars ? ` · 약 ${Math.round(meta.chars / 100) * 100}자` : ""}
            {meta.totalQ ? ` · ${meta.totalQ}문제 매칭` : ""}
          </p>
        </header>

        <div className="md:flex md:gap-6">
          {/* 좌측 사이드바 (단원 트리) */}
          <aside className="md:w-72 md:shrink-0 mb-6 md:mb-0">
            <div className="sticky top-20 space-y-3">
              {/* 검색 */}
              <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white px-3 py-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`${meta.totalTopics}단원 검색...`}
                  className="flex-1 text-sm bg-transparent outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 단원 트리 */}
              <nav className="rounded-2xl border border-[var(--gc-hairline)] bg-white max-h-[calc(100vh-220px)] overflow-y-auto">
                {search.trim() ? (
                  // 검색 결과 (그룹 무시)
                  <ul className="p-2 space-y-0.5">
                    {filtered.map((t) => (
                      <li key={t.topicId}>
                        <a
                          href={topicHref(t.topicId)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[#FFF7ED] hover:text-[var(--gc-amber)] transition-colors"
                        >
                          <span className="font-mono text-[10px] text-slate-400">{String(t.ord).padStart(2, "0")}</span>
                          <span className="flex-1 truncate">{t.title}</span>
                          {t.freq > 0 && (
                            <span className="text-[10px] text-[var(--gc-amber)] font-bold">{t.freq}회</span>
                          )}
                        </a>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-3 py-4 text-xs text-slate-400 text-center">검색 결과 없음</li>
                    )}
                  </ul>
                ) : (
                  // 그룹별 (접고 펴기)
                  <div className="p-1.5">
                    {groupKeys.map((gKey, gIdx) => {
                      const items = groups[gKey];
                      const collapsed = collapsedGroups[gKey];
                      const groupLabel = (items[0] as any)._groupLabel;
                      const colorClass = GROUP_COLORS[gIdx % GROUP_COLORS.length];
                      return (
                        <div key={gKey} className="mb-0.5">
                          <button
                            onClick={() => toggleGroup(gKey)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 rounded-lg border-l-2 ${colorClass}`}
                          >
                            <svg className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="flex-1 text-left">{groupLabel}</span>
                            <span className="text-[9px] font-mono">{items.length}</span>
                          </button>
                          {!collapsed && (
                            <ul className="ml-3 mt-0.5 space-y-0.5">
                              {items.map((t) => (
                                <li key={t.topicId}>
                                  <a
                                    href={topicHref(t.topicId)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-[var(--gc-ink)] rounded-md hover:bg-[#FFF7ED] hover:text-[var(--gc-amber)] transition-colors"
                                  >
                                    <span className="font-mono text-[10px] text-slate-400">{String(t.ord).padStart(2, "0")}</span>
                                    <span className="flex-1 truncate">{t.title}</span>
                                    {t.freq > 0 && (
                                      <span className="text-[9px] text-[var(--gc-amber)] font-bold">{t.freq}</span>
                                    )}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </nav>

              {/* 빠른 액션 */}
              <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-3 space-y-1.5">
                <Link
                  href={`${examMain}/${subjectSlug}/exam`}
                  className="block text-xs text-center font-bold text-[var(--gc-ink)] bg-[var(--gc-bg)] rounded-lg py-2 hover:bg-[#FFF7ED] hover:text-[var(--gc-amber)]"
                >
                  📝 {subjectLabel} 기출 풀기
                </Link>
                <Link
                  href={examMain}
                  className="block text-xs text-center font-medium text-slate-500 hover:text-[var(--gc-amber)] py-1"
                >
                  ← {examLabel} 메인
                </Link>
              </div>
            </div>
          </aside>

          {/* 우측 본문 — 단원 카드 그리드 */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 && search.trim() && (
              <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-12 text-center">
                <p className="text-slate-400">검색 결과가 없습니다.</p>
              </div>
            )}

            <div className="space-y-3">
              {filtered.map((t, idx) => {
                const colorClass = GROUP_COLORS[Math.floor((t.ord - 1) / 5) % GROUP_COLORS.length];
                return (
                  <a
                    key={t.topicId}
                    id={`topic-${t.topicId}`}
                    href={topicHref(t.topicId)}
                    className={`block rounded-2xl border border-[var(--gc-hairline)] border-l-4 ${colorClass} bg-white p-5 hover:shadow-md hover:border-[var(--gc-amber)] transition-all group`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="font-mono text-xs text-slate-400 mt-1 shrink-0">
                        {String(t.ord).padStart(2, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] group-hover:text-[var(--gc-amber)] transition-colors">
                          {t.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-[var(--gc-ink2)]">
                          {t.freq > 0 && <span>📊 출제 {t.freq}회</span>}
                          {t.questionCount > 0 && <span>📝 매칭 {t.questionCount}문제</span>}
                          {t.chars > 0 && <span>📄 {Math.round(t.chars / 100) * 100}자</span>}
                        </div>
                        {t.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {t.keywords.slice(0, 8).map((k) => (
                              <span
                                key={k}
                                className="text-[10px] px-1.5 py-0.5 bg-[#F5EFE4] text-[var(--gc-ink2)] rounded font-medium"
                              >
                                {k}
                              </span>
                            ))}
                            {t.keywords.length > 8 && (
                              <span className="text-[10px] text-slate-400">+{t.keywords.length - 8}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-[var(--gc-amber)] group-hover:translate-x-0.5 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Footer 안내 */}
            <div className="mt-6 rounded-2xl bg-white border border-[var(--gc-hairline)] p-4 text-[12px] text-[var(--gc-ink2)]">
              <strong className="text-[var(--gc-ink)]">💡 학습 팁:</strong> 단원 클릭 → 본문 + 매칭 기출문제 자동 표시. 기출 풀이 중에도 "관련 요약노트"로 단원 바로가기.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
