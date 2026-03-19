"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/study", label: "학습하기" },
  { href: "/notes", label: "요약노트" },
  { href: "/wrong-answers", label: "오답노트" },
  { href: "/board", label: "게시판" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-indigo-100/50">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="기출노트 한능검"
            width={32}
            height={32}
            className="rounded-lg group-hover:scale-105 transition-transform"
          />
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold gradient-text">기출노트</span>
            <span className="text-xs font-bold text-slate-400">한능검</span>
          </div>
        </Link>
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              pathname === href ||
              pathname.startsWith(href + "/") ||
              (href === "/study" && pathname.startsWith("/exam"));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                  isActive
                    ? "btn-primary !rounded-full !py-1.5 !px-3.5 text-[13px]"
                    : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
