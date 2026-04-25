import Link from "next/link";

export interface RoundListItem {
  /** unique key */
  id: string | number;
  /** main label (e.g. "제77회", "공인중개사 1차 (2024-10-26)") */
  label: string;
  /** href to the round page (will redirect to question 1) */
  href: string;
  /** small badge — 심화/기본/문항 수 etc. */
  badge?: string;
}

/**
 * Single-row exam round list. Used by both 한능검 (/exam) and CBT (/[examSlug]/[subjectSlug]/exam).
 */
export default function RoundList({ items }: { items: RoundListItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">📝</span>
            <span className="font-bold text-[15px] text-slate-900 truncate">{it.label}</span>
            {it.badge && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 shrink-0">
                {it.badge}
              </span>
            )}
          </div>
          <div className="flex items-center shrink-0">
            <svg
              className="h-4 w-4 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
