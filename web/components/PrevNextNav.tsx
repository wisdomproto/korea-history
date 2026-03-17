import Link from "next/link";

interface PrevNextNavProps {
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
  center?: { href: string; label: string };
}

export default function PrevNextNav({ prev, next, center }: PrevNextNavProps) {
  return (
    <div className="mt-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 card-shadow">
      <div className="w-1/3">
        {prev && (
          <Link
            href={prev.href}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="line-clamp-1">{prev.label}</span>
          </Link>
        )}
      </div>
      <div className="w-1/3 text-center">
        {center && (
          <Link
            href={center.href}
            className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {center.label}
          </Link>
        )}
      </div>
      <div className="w-1/3 text-right">
        {next && (
          <Link
            href={next.href}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <span className="line-clamp-1">{next.label}</span>
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
