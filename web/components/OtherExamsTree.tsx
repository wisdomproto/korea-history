"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExamType, ExamCategory, Subject } from "@/lib/exam-types";

interface Group {
  category: ExamCategory;
  examTypes: ExamType[];
}

export default function OtherExamsTree({
  groups,
  subjects,
  childrenByParentId = {},
}: {
  groups: Group[];
  subjects: Subject[];
  childrenByParentId?: Record<string, ExamType[]>;
}) {
  // 처음에는 첫 카테고리만 펼침
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups[0] ? [groups[0].category.id] : []),
  );

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {groups.map(({ category, examTypes }) => {
        const isCatOpen = expanded.has(category.id);
        return (
          <div
            key={category.id}
            className="rounded-2xl border border-[var(--gc-hairline)] bg-white overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(category.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--gc-bg)] transition-colors"
            >
              <span className="text-2xl shrink-0">{category.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-serif-kr text-lg font-bold text-[var(--gc-ink)]">
                  {category.label}
                </div>
                <div className="text-xs text-[var(--gc-ink2)]">{examTypes.length} 시험</div>
              </div>
              <span className="text-[var(--gc-ink2)] shrink-0">{isCatOpen ? "▾" : "▸"}</span>
            </button>

            {isCatOpen && (
              <div className="border-t border-[var(--gc-hairline)]">
                {examTypes.map((exam) => (
                  <ExamRow
                    key={exam.id}
                    exam={exam}
                    subjectsById={subjectsById}
                    expanded={expanded}
                    toggle={toggle}
                    children={childrenByParentId[exam.id] || []}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExamRow({
  exam,
  subjectsById,
  expanded,
  toggle,
  children,
}: {
  exam: ExamType;
  subjectsById: Map<string, Subject>;
  expanded: Set<string>;
  toggle: (id: string) => void;
  children: ExamType[];
}) {
  const allRefs = [
    ...exam.subjects.required,
    ...(exam.subjects.selectable ?? []),
  ];
  const liveSubjects = allRefs
    .filter((r) => r.status === "live")
    .map((r) => subjectsById.get(r.subjectId))
    .filter((s): s is Subject => !!s);

  const isContainer = exam.isContainer && children.length > 0;
  const hasMulti = isContainer || liveSubjects.length > 1;
  const isExamOpen = expanded.has(exam.id);

  return (
    <div className="border-b border-[var(--gc-hairline)] last:border-b-0">
      <div className="flex items-stretch">
        {hasMulti ? (
          <button
            type="button"
            onClick={() => toggle(exam.id)}
            className="flex items-center justify-center w-10 hover:bg-[var(--gc-bg)] text-[var(--gc-ink2)]"
            aria-label={isExamOpen ? "접기" : "펼치기"}
          >
            {isExamOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-10" />
        )}
        <Link
          href={exam.routes.main}
          className="flex-1 flex items-center gap-3 px-3 py-3 hover:bg-[var(--gc-bg)] transition-colors"
        >
          <span className="text-xl shrink-0">{exam.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-[var(--gc-ink)] truncate">{exam.shortLabel}</div>
            {isContainer ? (
              <div className="text-[11px] text-[var(--gc-ink2)] mt-0.5">
                {children.length} 직렬
              </div>
            ) : hasMulti ? (
              <div className="text-[11px] text-[var(--gc-ink2)] mt-0.5">
                {liveSubjects.length} 과목
              </div>
            ) : null}
          </div>
          <span className="text-[var(--gc-ink2)] shrink-0 text-sm">→</span>
        </Link>
      </div>

      {isContainer && isExamOpen && (
        <div className="bg-[var(--gc-bg)]/50 border-t border-[var(--gc-hairline)]">
          <div className="ml-10 p-3 space-y-1">
            {children.map((c) => (
              <JobSeriesRow
                key={c.id}
                exam={c}
                subjectsById={subjectsById}
                expanded={expanded}
                toggle={toggle}
              />
            ))}
          </div>
        </div>
      )}

      {!isContainer && hasMulti && isExamOpen && (
        <div className="bg-[var(--gc-bg)]/50 border-t border-[var(--gc-hairline)]">
          <div className="ml-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 p-3">
            {liveSubjects.map((s) => (
              <Link
                key={s.id}
                href={`${exam.routes.main}/${encodeURIComponent(s.slug)}`}
                className="rounded-md px-2 py-1.5 text-xs text-[var(--gc-ink)] bg-white hover:bg-[#FED7AA]/30 hover:text-[var(--gc-amber)] truncate transition-colors"
                title={s.label}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobSeriesRow({
  exam,
  subjectsById,
  expanded,
  toggle,
}: {
  exam: ExamType;
  subjectsById: Map<string, Subject>;
  expanded: Set<string>;
  toggle: (id: string) => void;
}) {
  const liveSubjects = [
    ...exam.subjects.required,
    ...(exam.subjects.selectable ?? []),
  ]
    .filter((r) => r.status === "live")
    .map((r) => subjectsById.get(r.subjectId))
    .filter((s): s is Subject => !!s);

  const isOpen = expanded.has(exam.id);
  const canExpand = liveSubjects.length > 0;

  return (
    <div className="rounded-md bg-white border border-[var(--gc-hairline)] overflow-hidden">
      <div className="flex items-stretch">
        {canExpand ? (
          <button
            type="button"
            onClick={() => toggle(exam.id)}
            className="flex items-center justify-center w-9 hover:bg-[var(--gc-bg)] text-[var(--gc-ink2)]"
            aria-label={isOpen ? "접기" : "펼치기"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-9" />
        )}
        <Link
          href={exam.routes.main}
          className="flex-1 flex items-center gap-2 px-2 py-2 hover:bg-[var(--gc-bg)] transition-colors"
        >
          <span className="text-base shrink-0">{exam.icon}</span>
          <span className="text-xs font-bold text-[var(--gc-ink)] truncate flex-1">
            {exam.shortLabel}
          </span>
          <span className="text-[10px] text-[var(--gc-ink2)] shrink-0">
            {liveSubjects.length}과목
          </span>
        </Link>
      </div>

      {isOpen && canExpand && (
        <div className="bg-[var(--gc-bg)]/40 border-t border-[var(--gc-hairline)]">
          <div className="ml-9 grid grid-cols-2 sm:grid-cols-3 gap-1 p-2">
            {liveSubjects.map((s) => (
              <Link
                key={s.id}
                href={`${exam.routes.main}/${encodeURIComponent(s.slug)}`}
                className="rounded px-2 py-1 text-[11px] text-[var(--gc-ink)] bg-white hover:bg-[#FED7AA]/30 hover:text-[var(--gc-amber)] truncate transition-colors"
                title={s.label}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
