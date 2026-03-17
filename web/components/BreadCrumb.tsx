import Link from "next/link";

interface BreadCrumbItem {
  label: string;
  href?: string;
}

export default function BreadCrumb({ items }: { items: BreadCrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-4 text-xs text-slate-400">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            홈
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {item.href ? (
              <Link href={item.href} className="hover:text-indigo-600 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-600 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
