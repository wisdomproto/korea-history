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
    <header className="sticky top-0 z-50 border-b border-white/30" style={{
      background: "linear-gradient(90deg, rgba(232,213,242,0.95) 0%, rgba(184,230,225,0.95) 50%, rgba(168,230,207,0.95) 100%)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
    }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">👨‍🎓</span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold text-slate-800">기출노트</span>
            <span className="text-xs font-bold text-slate-500">한능검</span>
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
                    ? "bg-white/80 text-slate-800 shadow-sm"
                    : "text-slate-600 hover:bg-white/50 hover:text-slate-800"
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
