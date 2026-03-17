import Link from "next/link";

interface BreadCrumbItem {
  label: string;
  href?: string;
}

export default function BreadCrumb({ items }: { items: BreadCrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-4 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-indigo-600">
            🏠
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="text-gray-300">&gt;</span>
            {item.href ? (
              <Link href={item.href} className="hover:text-indigo-600">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-700">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
