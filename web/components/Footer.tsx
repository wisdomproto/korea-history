import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-3xl px-4 py-6 text-center text-sm text-slate-400">
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/privacy" className="hover:text-indigo-600 transition-colors">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="hover:text-indigo-600 transition-colors">
            이용약관
          </Link>
        </div>
        <p className="text-xs">&copy; {new Date().getFullYear()} 기출노트 한능검. All rights reserved.</p>
        {/* Build timestamp for deployment verification */}
        <p className="text-[10px] text-slate-300 mt-1" data-build={process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString()}>
          Build: {process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString().slice(0, 16)}
        </p>
      </div>
    </footer>
  );
}
