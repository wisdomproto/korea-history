"use client";

import { usePathname } from "next/navigation";
import { CoupangCard, COUPANG_DISCLOSURE } from "@/components/CoupangAd";
import { getCoupangProductsForPath, type CoupangBook } from "@/lib/coupang-products";

/**
 * PC 와이드 화면 좌우 사이드 광고 (스카이스크래퍼 자리).
 * 본문 max-w-6xl(1152px) 바깥 여백에 fixed 세로 카드. 2xl(1536px)+ 에서만 노출
 * (그 미만은 좌우 공간 부족 → 본문 인라인 카드로 커버). 홈("/")은 광고 제외.
 * 경로별로 한능검=한국사 / 공무원=과목 매칭 상품 노출.
 */
export default function SideRails() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const books = getCoupangProductsForPath(pathname);
  if (books.length === 0) return null;

  const left = books[0];
  const right = books[books.length - 1]; // 1권이면 동일, 여러 개면 양쪽 다른 책

  const Rail = ({ book, side }: { book: CoupangBook; side: "left" | "right" }) => (
    <aside
      className={`hidden 2xl:block fixed top-1/2 z-30 -translate-y-1/2 ${
        side === "left" ? "left-4" : "right-4"
      }`}
      aria-label="추천 상품 광고"
    >
      <div className="mb-1 text-center text-[10px] text-slate-400">AD · 쿠팡파트너스</div>
      <CoupangCard book={book} variant="vertical" />
      <p className="mt-1 w-[150px] text-center text-[9px] leading-tight text-slate-300">
        {COUPANG_DISCLOSURE}
      </p>
    </aside>
  );

  return (
    <>
      <Rail book={left} side="left" />
      <Rail book={right} side="right" />
    </>
  );
}
