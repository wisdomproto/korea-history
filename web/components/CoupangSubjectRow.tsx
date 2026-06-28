"use client";

import { usePathname } from "next/navigation";
import { CoupangProductRow } from "@/components/CoupangAd";
import { getCoupangProductsForPath } from "@/lib/coupang-products";

/**
 * 경로 자동 감지 추천 상품 줄 — 어디에 두든 현재 페이지 주제에 맞는 상품을 노출.
 * 한능검 영역 → 한국사 / 공무원 과목 페이지 → 과목 매칭 상품. drop-in (prop 불필요).
 */
export default function CoupangSubjectRow({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const products = getCoupangProductsForPath(pathname || "/");
  return <CoupangProductRow products={products} className={className} />;
}
