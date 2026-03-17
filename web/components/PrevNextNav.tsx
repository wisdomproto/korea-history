import Link from "next/link";

interface PrevNextNavProps {
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
  center?: { href: string; label: string };
}

export default function PrevNextNav({ prev, next, center }: PrevNextNavProps) {
  return (
    <div className="mt-8 flex items-center justify-between rounded-xl border border-gray-200 p-3">
      <div className="w-1/3">
        {prev && (
          <Link
            href={prev.href}
            className="text-sm text-gray-600 hover:text-indigo-600"
          >
            &larr; {prev.label}
          </Link>
        )}
      </div>
      <div className="w-1/3 text-center">
        {center && (
          <Link
            href={center.href}
            className="text-sm font-medium text-gray-500 hover:text-indigo-600"
          >
            {center.label}
          </Link>
        )}
      </div>
      <div className="w-1/3 text-right">
        {next && (
          <Link
            href={next.href}
            className="text-sm text-gray-600 hover:text-indigo-600"
          >
            {next.label} &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
