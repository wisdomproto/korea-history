"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/study", label: "학습하기", icon: "📚" },
  { href: "/notes", label: "요약노트", icon: "📝" },
  { href: "/wrong-answers", label: "오답노트", icon: "🔄" },
  { href: "/board", label: "게시판", icon: "💬" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/30" style={{
      background: "linear-gradient(90deg, rgba(232,213,242,0.95) 0%, rgba(184,230,225,0.95) 50%, rgba(168,230,207,0.95) 100%)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
    }}>
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">👨‍🎓</span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold text-slate-800">기출노트</span>
            <span className="text-xs font-bold text-slate-500">한능검</span>
          </div>
        </Link>

        {/* Nav — left aligned */}
        <nav className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive =
              pathname === href ||
              pathname.startsWith(href + "/") ||
              (href === "/study" && pathname.startsWith("/exam"));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1 shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-bold transition-all ${
                  isActive
                    ? "bg-white/90 text-slate-800 shadow-sm"
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                }`}
              >
                <span className="text-sm">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings — right */}
        <Link
          href="/admin/banners"
          className="ml-auto shrink-0 rounded-xl p-2 text-slate-400 hover:bg-white/50 hover:text-slate-600 transition-all"
          title="관리"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
