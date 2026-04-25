"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { ExamType, Subject } from "@/lib/exam-types";

interface Props {
  /** 현재 활성 시험 (드롭다운 라벨) */
  current: ExamType | null;
  /** 현재 활성 과목 slug (URL 기반, null이면 시험 단위) */
  currentSubjectSlug?: string | null;
  /** 모든 시험 (서버에서 전달) */
  examTypes: ExamType[];
  /** 모든 과목 (트리 leaf 라벨) */
  subjects: Subject[];
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  civil: { label: "공무원", icon: "🏛️" },
  cert: { label: "자격증", icon: "🪪" },
  driver: { label: "운전", icon: "🚗" },
  corporate: { label: "인적성", icon: "🏢" },
  language: { label: "어학", icon: "🌐" },
};

export default function ExamSelector({ current, currentSubjectSlug, examTypes, subjects }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 자동 펼침: 현재 시험 카테고리 + 시험은 펼친 상태로 시작
  useEffect(() => {
    if (open && current) {
      setExpanded((prev) => new Set([...prev, current.category, current.id]));
    }
  }, [open, current]);

  // 현재 과목 강조용
  const currentSubjId = currentSubjectSlug
    ? subjects.find((s) => s.slug === currentSubjectSlug)?.id
    : null;

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const subjectsBySlug = new Map(subjects.map((s) => [s.slug, s]));

  // 카테고리별 그룹화 — 자식 직렬 ExamType은 부모 아래 nested로만 보여주기 위해 top-level에서 제외
  const byCategory = examTypes
    .filter((e) => !e.parentExamId)
    .reduce<Record<string, ExamType[]>>((acc, e) => {
      (acc[e.category] ??= []).push(e);
      return acc;
    }, {});

  // parentId → children 매핑
  const childrenByParentId: Record<string, ExamType[]> = {};
  for (const e of examTypes) {
    if (e.parentExamId) (childrenByParentId[e.parentExamId] ??= []).push(e);
  }

  // 버튼 라벨 — 시험 + 과목 조합. /[examSlug]/[subjectSlug]에 있으면 둘 다 표시
  const currentSubject = currentSubjectSlug ? subjectsBySlug.get(currentSubjectSlug) : null;
  const buttonLabel = current
    ? currentSubject && currentSubject.id !== current.id
      ? `${current.icon} ${current.shortLabel} · ${currentSubject.shortLabel}`
      : `${current.icon} ${current.shortLabel}`
    : "🔍 시험 선택";

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--gc-hairline)] bg-white px-4 py-1.5 text-sm font-bold text-[var(--gc-ink)] hover:border-[var(--gc-amber)] transition-colors max-w-[420px]"
      >
        <span className="whitespace-nowrap">{buttonLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-[320px] sm:w-[380px] max-h-[75vh] overflow-y-auto rounded-2xl border border-[var(--gc-hairline)] bg-white shadow-xl z-50"
          role="menu"
        >
          <div className="p-2">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--gc-amber)] hover:bg-[var(--gc-bg)]"
            >
              ← 홈으로
            </Link>
          </div>

          <div className="border-t border-[var(--gc-hairline)] p-2 pb-3 space-y-1">
            {Object.entries(byCategory).map(([categoryId, exams]) => {
              const cat = CATEGORY_LABELS[categoryId] ?? { label: categoryId, icon: "" };
              const isCatOpen = expanded.has(categoryId);
              return (
                <div key={categoryId}>
                  <button
                    type="button"
                    onClick={() => toggleNode(categoryId)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--gc-ink2)] hover:text-[var(--gc-ink)] hover:bg-[var(--gc-bg)] rounded-md"
                  >
                    <span className="text-[10px] w-3">{isCatOpen ? "▾" : "▸"}</span>
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className="ml-auto text-[10px]">{exams.length}</span>
                  </button>

                  {isCatOpen && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-[var(--gc-hairline)] pl-2">
                      {exams.map((exam) => {
                        const isExamOpen = expanded.has(exam.id);
                        const isCurrent = current?.id === exam.id;
                        const childExams = childrenByParentId[exam.id] || [];
                        const isContainer = exam.isContainer && childExams.length > 0;

                        const allSubjects = [
                          ...exam.subjects.required,
                          ...(exam.subjects.selectable ?? []),
                        ];
                        const liveSubjects = allSubjects
                          .filter((r) => r.status === "live")
                          .map((r) => subjectsById.get(r.subjectId))
                          .filter((s): s is Subject => !!s);

                        const hasMultipleSubjects = liveSubjects.length > 1;
                        const isExpandable = isContainer || hasMultipleSubjects;

                        return (
                          <div key={exam.id}>
                            <div className="flex items-center">
                              {isExpandable ? (
                                <button
                                  type="button"
                                  onClick={() => toggleNode(exam.id)}
                                  className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-[var(--gc-ink2)] hover:text-[var(--gc-ink)] rounded"
                                  aria-label={isExamOpen ? "접기" : "펼치기"}
                                >
                                  <span className="w-3">{isExamOpen ? "▾" : "▸"}</span>
                                </button>
                              ) : (
                                <span className="w-5" />
                              )}
                              <Link
                                href={exam.routes.main}
                                onClick={() => setOpen(false)}
                                className={`flex-1 flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors ${
                                  isCurrent
                                    ? "bg-[#FED7AA]/40 text-[var(--gc-ink)] font-bold"
                                    : "text-[var(--gc-ink)] hover:bg-[var(--gc-bg)]"
                                }`}
                              >
                                <span>{exam.icon}</span>
                                <span className="flex-1 truncate">{exam.shortLabel}</span>
                                {isContainer ? (
                                  <span className="text-[10px] text-[var(--gc-ink2)]">
                                    {childExams.length}직렬
                                  </span>
                                ) : hasMultipleSubjects ? (
                                  <span className="text-[10px] text-[var(--gc-ink2)]">
                                    {liveSubjects.length}과목
                                  </span>
                                ) : null}
                                {isCurrent && (
                                  <span className="text-[var(--gc-amber)]">●</span>
                                )}
                              </Link>
                            </div>

                            {/* 직렬 nested (부모 컨테이너) — 직렬 클릭 가능 + 펼치면 과목까지 */}
                            {isContainer && isExamOpen && (
                              <div className="ml-7 mt-0.5 space-y-0.5 border-l border-[var(--gc-hairline)] pl-2 pb-1">
                                {childExams.map((c) => {
                                  const isCurrentChild = current?.id === c.id;
                                  const isChildOpen = expanded.has(c.id);
                                  const childRefs = [
                                    ...c.subjects.required,
                                    ...(c.subjects.selectable ?? []),
                                  ];
                                  const childLiveSubjects = childRefs
                                    .filter((r) => r.status === "live")
                                    .map((r) => subjectsById.get(r.subjectId))
                                    .filter((s): s is Subject => !!s);
                                  return (
                                    <div key={c.id}>
                                      <div className="flex items-center">
                                        {childLiveSubjects.length > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => toggleNode(c.id)}
                                            className="flex items-center gap-1 px-1 py-0.5 text-[10px] text-[var(--gc-ink2)] hover:text-[var(--gc-ink)] rounded"
                                            aria-label={isChildOpen ? "접기" : "펼치기"}
                                          >
                                            <span className="w-3">{isChildOpen ? "▾" : "▸"}</span>
                                          </button>
                                        ) : (
                                          <span className="w-4" />
                                        )}
                                        <Link
                                          href={c.routes.main}
                                          onClick={() => setOpen(false)}
                                          className={`flex-1 flex items-center gap-1 rounded px-2 py-1 text-xs ${
                                            isCurrentChild
                                              ? "bg-[#FED7AA]/40 text-[var(--gc-ink)] font-bold"
                                              : "text-[var(--gc-ink2)] hover:text-[var(--gc-ink)] hover:bg-[var(--gc-bg)]"
                                          }`}
                                        >
                                          <span>{c.icon}</span>
                                          <span className="flex-1 truncate">{c.shortLabel}</span>
                                          <span className="text-[10px] text-[var(--gc-ink2)]">
                                            {childLiveSubjects.length}
                                          </span>
                                          {isCurrentChild && (
                                            <span className="text-[var(--gc-amber)]">●</span>
                                          )}
                                        </Link>
                                      </div>

                                      {isChildOpen && childLiveSubjects.length > 0 && (
                                        <div className="ml-6 mt-0.5 space-y-0.5 border-l border-[var(--gc-hairline)] pl-2 pb-1">
                                          {childLiveSubjects.map((s) => {
                                            const isCurrentSubj =
                                              isCurrentChild && currentSubjId === s.id;
                                            return (
                                              <Link
                                                key={s.id}
                                                href={`${c.routes.main}/${encodeURIComponent(s.slug)}`}
                                                onClick={() => setOpen(false)}
                                                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
                                                  isCurrentSubj
                                                    ? "bg-[#FED7AA]/40 text-[var(--gc-ink)] font-bold"
                                                    : "text-[var(--gc-ink2)] hover:text-[var(--gc-ink)] hover:bg-[var(--gc-bg)]"
                                                }`}
                                              >
                                                <span className="flex-1 truncate">{s.label}</span>
                                                {isCurrentSubj && (
                                                  <span className="text-[var(--gc-amber)]">●</span>
                                                )}
                                              </Link>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* 과목 nested (직렬 또는 단일 ExamType) */}
                            {!isContainer && hasMultipleSubjects && isExamOpen && (
                              <div className="ml-7 mt-0.5 space-y-0.5 border-l border-[var(--gc-hairline)] pl-2 pb-1">
                                {liveSubjects.map((s) => {
                                  const isCurrentSubj = isCurrent && currentSubjId === s.id;
                                  return (
                                    <Link
                                      key={s.id}
                                      href={`${exam.routes.main}/${encodeURIComponent(s.slug)}`}
                                      onClick={() => setOpen(false)}
                                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                                        isCurrentSubj
                                          ? "bg-[#FED7AA]/40 text-[var(--gc-ink)] font-bold"
                                          : "text-[var(--gc-ink2)] hover:text-[var(--gc-ink)] hover:bg-[var(--gc-bg)]"
                                      }`}
                                    >
                                      <span className="flex-1 truncate">{s.label}</span>
                                      {isCurrentSubj && (
                                        <span className="text-[var(--gc-amber)]">●</span>
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
