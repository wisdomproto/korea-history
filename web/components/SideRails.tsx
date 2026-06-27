"use client";

import { usePathname } from "next/navigation";
import { CoupangProduct, COUPANG_DISCLOSURE } from "@/components/CoupangAd";
import { getCoupangProducts } from "@/lib/coupang-products";

/**
 * PC 와이드 화면 좌우 사이드 광고 (스카이스크래퍼 자리).
 *
 * 본문은 max-w-6xl(1152px) 중앙 정렬이라 그보다 넓은 화면에서 양쪽 여백이 남는다.
 * 그 여백에 fixed 세로 광고를 띄움 — 모바일/태블릿(여백 부족)엔 숨김(2xl 미만), 본문과 절대 겹치지 않음.
 *   - 2xl(1536px): 좌우 여백 각 ~192px → 카드(120×scale) 안전하게 들어감
 *   - 그 미만(노트북/태블릿/모바일)은 본문 인라인 광고로 커버
 *
 * 홈("/")은 광고 제외(사용자 결정). 상품 없으면 렌더 안 함.
 */
export default function SideRails() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const products = getCoupangProducts("history");
  if (products.length === 0) return null;

  const leftSrc = products[0];
  const rightSrc = products[products.length - 1]; // 1개면 동일 상품, 여러 개면 양쪽 다른 상품

  const Rail = ({ src, side }: { src: string; side: "left" | "right" }) => (
    <aside
      className={`hidden 2xl:flex fixed top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1 ${
        side === "left" ? "left-4" : "right-4"
      }`}
      aria-label="추천 상품 광고"
    >
      <span className="text-[10px] text-slate-400">AD · 쿠팡파트너스</span>
      <CoupangProduct src={src} scale={1.2} />
      <p className="w-[150px] text-center text-[9px] leading-tight text-slate-300">
        {COUPANG_DISCLOSURE}
      </p>
    </aside>
  );

  return (
    <>
      <Rail src={leftSrc} side="left" />
      <Rail src={rightSrc} side="right" />
    </>
  );
}
