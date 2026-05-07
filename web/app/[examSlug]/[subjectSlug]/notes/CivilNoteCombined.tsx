"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import NotesShell from "@/components/notes/NotesShell";
import type { NoteGroup, NoteListItem, NotesShellMeta, BreadcrumbItem } from "@/components/notes/types";

interface TopicData {
  topicId: string;
  ord: number;
  title: string;
  keywords: string[];
  freq: number;
  chars: number;
  html: string;
}

interface Props {
  examLabel: string;
  examMain: string;
  subjectLabel: string;
  subjectSlug: string;
  noteSlug: string;
  noteStyle: string;
  topics: TopicData[];
  meta: { totalTopics: number; chars: number; subtitle: string };
}

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

/**
 * 단권화 노트의 모든 단원을 한 페이지에 accordion으로 노출. 한능검 NoteContent 패턴
 * 동일 — 마운트 시 모든 details 자동 펼침 + "전체 펼치기/닫기" 툴바.
 * 사이드바는 #topic-{id} 앵커로 같은 페이지 내 점프.
 * 개별 단원 URL `/civil-notes/{slug}/{topicId}`은 SEO/직접링크용으로 유지.
 */
export default function CivilNoteCombined({
  examLabel,
  examMain,
  subjectLabel,
  subjectSlug,
  noteSlug,
  noteStyle,
  topics,
  meta,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | undefined>(topics[0]?.topicId);

  // 마운트 시 모든 details 자동 펼침
  useEffect(() => {
    containerRef.current
      ?.querySelectorAll<HTMLDetailsElement>("details[data-civil-topic]")
      .forEach((d) => d.setAttribute("open", ""));
  }, []);

  // 스크롤 스파이 — viewport 상단 근처에 들어온 단원을 active로
  useEffect(() => {
    if (!containerRef.current) return;
    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>("details[data-civil-topic]"),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 모든 요소 중 가장 위에 있으면서 visible인 것을 active로
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            id: e.target.id.replace(/^topic-/, ""),
            top: e.boundingClientRect.top,
          }))
          .sort((a, b) => a.top - b.top);
        if (visible.length > 0) {
          setActiveId(visible[0].id);
        }
      },
      // 상단 25%~70% 사이에 들어온 요소만 카운트 — 사용자 시선 위치
      { rootMargin: "-25% 0px -70% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [topics.length]);

  const expandAll = useCallback(() => {
    containerRef.current
      ?.querySelectorAll<HTMLDetailsElement>("details[data-civil-topic]")
      .forEach((d) => d.setAttribute("open", ""));
  }, []);

  const collapseAll = useCallback(() => {
    containerRef.current
      ?.querySelectorAll<HTMLDetailsElement>("details[data-civil-topic]")
      .forEach((d) => d.removeAttribute("open"));
  }, []);

  // 사이드바 — 5개씩 그룹핑, 앵커 href
  const items: NoteListItem[] = topics.map((t) => ({
    id: t.topicId,
    ord: t.ord,
    title: t.title,
    href: `#topic-${t.topicId}`,
    keywords: t.keywords,
    freqCount: t.freq,
    charCount: t.chars,
  }));

  const groupSize = 5;
  const groups: NoteGroup[] = [];
  for (let i = 0; i < items.length; i += groupSize) {
    const groupNum = Math.floor(i / groupSize) + 1;
    const startOrd = i + 1;
    const endOrd = Math.min(i + groupSize, items.length);
    groups.push({
      key: `g${groupNum}`,
      label: `단원 ${startOrd}~${endOrd}`,
      items: items.slice(i, i + groupSize),
      colorClass: GROUP_COLORS[(groupNum - 1) % GROUP_COLORS.length],
    });
  }

  const shellMeta: NotesShellMeta = {
    eyebrow: `Civil Notes · ${examLabel}`,
    titleLead: subjectLabel,
    titleAccent: "요약노트",
    subtitle: `${meta.subtitle} · ${meta.totalTopics}단원${meta.chars ? ` · 약 ${Math.round(meta.chars / 100) * 100}자` : ""}`,
    quickActions: [
      {
        label: `📝 ${subjectLabel} 기출 풀기`,
        href: `${examMain}/${subjectSlug}/exam`,
        primary: true,
      },
      { label: `← ${examLabel} 메인`, href: examMain },
    ],
  };

  const breadcrumb: BreadcrumbItem[] = [
    { label: "홈", href: "/" },
    { label: examLabel, href: examMain },
    { label: `${subjectLabel} 요약노트` },
  ];

  // topic.style은 이미 `<style>...</style>` 래퍼를 포함하고 있어서 그대로 React <style>에 넣으면
  // <style><style>...</style></style> 중첩이 됨 → CSS 무시. 래퍼만 벗겨 raw CSS만 추출.
  // Windows에서 읽은 파일의 \r\n도 \n로 정규화 (hydration mismatch 방지).
  const cleanStyle = noteStyle
    .replace(/^[\s\S]*?<style[^>]*>/, "")
    .replace(/<\/style>[\s\S]*$/, "")
    .replace(/\r\n/g, "\n");

  return (
    <NotesShell meta={shellMeta} groups={groups} breadcrumb={breadcrumb} activeId={activeId}>
      {/* 노트 디자인 시스템 (cream/amber) — 원본 HTML 임베디드 스타일 적용 */}
      <style dangerouslySetInnerHTML={{ __html: cleanStyle }} />

      {/* Hero — children mode에서는 NotesShell이 헤더를 안 그리므로 직접 노출 */}
      <header className="mb-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)] font-bold mb-2">
          {shellMeta.eyebrow}
        </div>
        <h1 className="font-serif-kr text-3xl md:text-4xl font-black text-[var(--gc-ink)] tracking-tight">
          <span>{subjectLabel} </span>
          <span className="text-[var(--gc-amber)]">요약노트</span>
        </h1>
        {shellMeta.subtitle && (
          <p className="text-sm text-[var(--gc-ink2)] mt-2">{shellMeta.subtitle}</p>
        )}
      </header>

      {/* Toolbar — 전체 펼치기/닫기 */}
      <div className="flex items-center gap-2 mb-4 sticky top-2 z-10">
        <button
          onClick={expandAll}
          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          전체 펼치기
        </button>
        <button
          onClick={collapseAll}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          전체 닫기
        </button>
      </div>

      {/* 단원 본문 — 모두 한 페이지, 각 단원 details */}
      <div ref={containerRef} className="space-y-4">
        {topics.map((t, idx) => {
          const accentColor = GROUP_COLORS[Math.floor(idx / groupSize) % GROUP_COLORS.length];
          return (
            <details
              key={t.topicId}
              id={`topic-${t.topicId}`}
              data-civil-topic
              className={`rounded-2xl border-l-4 ${accentColor} border border-[var(--gc-hairline)] bg-white scroll-mt-20 group overflow-hidden shadow-sm hover:shadow-md transition-shadow open:shadow-md`}
            >
              <summary
                className="cursor-pointer list-none px-5 py-4 flex items-center gap-3 select-none transition-all bg-gradient-to-r from-white to-[var(--gc-bg)] group-open:from-[#FFF7ED] group-open:to-[#FED7AA]/40 group-open:border-b group-open:border-[var(--gc-amber)]/20"
              >
                <span className="font-mono text-xs font-bold text-slate-400 group-open:text-[var(--gc-amber)] shrink-0">
                  {String(t.ord).padStart(2, "0")}
                </span>
                <span className="font-serif-kr text-lg md:text-xl font-black text-[var(--gc-ink)] group-open:text-[#7C2D12] flex-1 min-w-0 leading-tight">
                  {t.title}
                </span>
                {t.freq > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--gc-amber)]/10 text-[var(--gc-amber)] shrink-0">
                    🔥 출제 {t.freq}회
                  </span>
                )}
                <svg
                  className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180 group-open:text-[var(--gc-amber)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>

              {/* topic.style이 자체 색상/테이블/뱃지 시스템 보유 — note-content 클래스 미사용 (덮어쓰기 방지) */}
              <div className="px-5 sm:px-6 py-5">
                <article dangerouslySetInnerHTML={{ __html: t.html }} />
              </div>
            </details>
          );
        })}
      </div>

      {/* 하단 액션 */}
      <nav className="mt-10 flex flex-wrap gap-3">
        <a
          href={`${examMain}/${subjectSlug}/exam`}
          className="rounded-full bg-[var(--gc-ink)] text-white px-5 py-2 text-sm font-bold hover:bg-[var(--gc-amber)]"
        >
          📝 {subjectLabel} 기출 풀기
        </a>
        <a
          href={examMain}
          className="rounded-full border border-[var(--gc-hairline)] bg-white px-5 py-2 text-sm font-bold text-[var(--gc-ink)]"
        >
          ← {examLabel} 메인
        </a>
      </nav>
    </NotesShell>
  );
}
