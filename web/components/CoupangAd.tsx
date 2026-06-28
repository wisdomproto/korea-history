"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import type { CoupangBook } from "@/lib/coupang-products";

/**
 * Coupang Partners 다이나믹 배너 — iframe 격리 방식.
 *
 * 왜 iframe(srcDoc)인가:
 *   - 쿠팡 g.js 는 스크립트 실행 위치에 iframe/광고를 주입하는데, Next.js SPA 라우팅·
 *     컴포넌트 재mount 환경에서 직접 주입하면 중복/유실이 잦음. 각 배너를 자체 srcDoc
 *     iframe 으로 격리하면 SPA 이동·중복 mount 에 안전하고, 실패해도 부모 페이지 무영향.
 *   - 별도 hook 불필요 → 서버/클라이언트 컴포넌트 양쪽에서 import 가능.
 *
 * 활성화: ID 두 개를 채우면 전 배치가 동시에 켜짐. 미설정 시 아무것도 렌더 안 함
 *   (빈 박스가 프로덕션에 안 나감 → 가입 전에도 안전하게 배포 가능).
 *     NEXT_PUBLIC_COUPANG_PARTNERS_ID    = 다이나믹 배너 id (숫자, 대시보드 생성 시 발급)
 *     NEXT_PUBLIC_COUPANG_TRACKING_CODE  = trackingCode (예: "AF1234567")
 *
 * 고지: 쿠팡파트너스 정책상 수수료 고지 문구 필수 → CoupangBand 에 내장.
 */

const PARTNERS_ID = process.env.NEXT_PUBLIC_COUPANG_PARTNERS_ID;
// 트래킹코드 기본값 = 계정 채널 ID (env 로 덮어쓰기 가능)
const TRACKING_CODE = process.env.NEXT_PUBLIC_COUPANG_TRACKING_CODE || "AF4431481";

export const COUPANG_ENABLED = Boolean(PARTNERS_ID && TRACKING_CODE);

// 쿠팡파트너스 필수 고지 문구 (공정위 심사지침 — 공식 문장 그대로)
export const COUPANG_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

interface CoupangAdProps {
  /** 배너 폭 (px 숫자 또는 "100%"). 기본 "100%" */
  width?: number | string;
  /** 배너 높이 px. 기본 140 */
  height?: number;
  /** carousel(상품 회전) | banner. 기본 carousel */
  template?: "carousel" | "banner";
  /** 배치별 성과 추적용 subId (예: "note", "result", "question") */
  subId?: string;
  className?: string;
}

/** 단일 다이나믹 배너 (격리 iframe). ID 없으면 null. */
export function CoupangAd({
  width = "100%",
  height = 140,
  template = "carousel",
  subId,
  className = "",
}: CoupangAdProps) {
  if (!COUPANG_ENABLED) return null;

  const config = {
    id: Number(PARTNERS_ID),
    trackingCode: TRACKING_CODE,
    template,
    width: typeof width === "number" ? String(width) : width,
    height: String(height),
    ...(subId ? { subId } : {}),
  };

  // about:srcdoc 안에서 g.js 가 실행되며 배너를 주입. allow-popups: 상품 클릭 새 탭.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script src="https://ads-partners.coupang.com/g.js"></script><script>new PartnersCoupang.G(${JSON.stringify(
    config,
  )});</script></body></html>`;

  return (
    <iframe
      title="쿠팡 파트너스 추천 상품"
      srcDoc={srcDoc}
      width={typeof width === "number" ? width : "100%"}
      height={height}
      scrolling="no"
      frameBorder={0}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className={`block w-full border-0 ${className}`}
      style={{ width: "100%", height }}
    />
  );
}

interface CoupangBandProps {
  /** 배치별 성과 추적용 subId */
  subId?: string;
  /** 섹션 제목. 기본 "수험생 추천템" */
  heading?: string;
  height?: number;
  className?: string;
}

/**
 * 맥락형 추천 밴드 — "수험생 추천템" 헤딩 + 다이나믹 배너 + 수수료 고지.
 * 노트/결과/문제/홈 등 학습 맥락 자리에 배치. ID 없으면 통째로 null.
 */
export function CoupangBand({
  subId,
  heading = "수험생 추천템",
  height = 140,
  className = "",
}: CoupangBandProps) {
  if (!COUPANG_ENABLED) return null;

  return (
    <section
      className={`rounded-2xl border border-[var(--gc-hairline,#e5ddcf)] bg-[var(--gc-paper,#fff)] p-4 ${className}`}
      aria-label={heading}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-[var(--gc-amber,#B45309)]">
          📚 {heading}
        </span>
        <span className="text-[10px] text-slate-400">AD · 쿠팡</span>
      </div>
      <CoupangAd subId={subId} height={height} />
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{COUPANG_DISCLOSURE}</p>
    </section>
  );
}

// ── 상품 링크(큐레이션) ────────────────────────────────────────────────
// 쿠팡 "상품 링크" iframe 위젯. 제휴 코드가 src 에 포함돼 env 불필요 →
// 배포 즉시 라이브(승인 스크린샷 가능). 다이나믹 배너보다 맥락 일치·전환율 우위.

/**
 * 단일 상품 위젯 (coupa.ng iframe). 쿠팡 링크는 고정 120×240 라 CSS transform 으로 확대.
 *
 *  - scale 지정 → 그 배율 고정 (사이드레일 등 고정 크기 자리).
 *  - scale 미지정 → 반응형: 모바일 1.3배(156×312) → sm 1.5배(180×360) → lg 1.8배(216×432).
 *    화면 폭에 맞춰 카드가 커지고 작아짐(적응형). 책 표지 이미지라 스케일 업해도 무리 없음.
 */
export function CoupangProduct({
  src,
  scale,
  className = "",
}: {
  src: string;
  scale?: number;
  className?: string;
}) {
  const iframe = (
    <iframe
      title="쿠팡 추천 상품"
      src={src}
      width={120}
      height={240}
      scrolling="no"
      frameBorder={0}
      referrerPolicy="unsafe-url"
      className="origin-top-left border-0"
    />
  );

  // 고정 배율 (사이드레일 등)
  if (scale != null) {
    return (
      <div
        className={`shrink-0 overflow-hidden ${className}`}
        style={{ width: 120 * scale, height: 240 * scale }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 120, height: 240 }}>
          {iframe}
        </div>
      </div>
    );
  }

  // 반응형 배율 (인라인 추천줄) — Tailwind 임의 속성으로 breakpoint 별 scale
  return (
    <div
      className={
        "shrink-0 overflow-hidden " +
        "w-[156px] h-[312px] sm:w-[180px] sm:h-[360px] lg:w-[216px] lg:h-[432px] " +
        className
      }
    >
      <div
        className={
          "origin-top-left w-[120px] h-[240px] " +
          "[transform:scale(1.3)] sm:[transform:scale(1.5)] lg:[transform:scale(1.8)]"
        }
      >
        {iframe}
      </div>
    </div>
  );
}

/**
 * 자체 상품 카드 (쿠팡 위젯 대신) — 표지 + 제목 + CTA, 제휴 링크로 이동.
 * horizontal: 본문 추천줄(PC 폭 채움) / vertical: PC 사이드레일(좁은 세로).
 */
export function CoupangCard({
  book,
  variant = "horizontal",
}: {
  book: CoupangBook;
  variant?: "horizontal" | "vertical";
}) {
  const href = `https://coupa.ng/${book.code}`;
  const hideOnError = (e: SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
  };

  if (variant === "vertical") {
    return (
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener"
        className="block w-[150px] rounded-xl border border-[var(--gc-hairline,#e5ddcf)] bg-white p-2 transition hover:shadow-md"
      >
        <img
          src={book.image}
          alt={book.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={hideOnError}
          className="h-[140px] w-full rounded-lg object-contain"
        />
        <div className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-700">
          {book.title}
        </div>
        <span className="mt-1.5 block rounded-full bg-[var(--gc-amber,#B45309)] px-2 py-1 text-center text-[11px] font-bold text-white">
          쿠팡에서 보기
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener"
      className="group relative block w-full overflow-hidden rounded-3xl border border-[#ece0c8] bg-gradient-to-br from-[#fdf9f0] to-[#f6ecda] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
    >
      {/* 한국풍 장식 모티프 (은은하게) — 단청 원 + 물결 + 점 */}
      <svg
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 text-[var(--gc-amber,#B45309)] opacity-[0.07]"
        viewBox="0 0 200 120"
        fill="none"
        preserveAspectRatio="xMaxYMid slice"
        aria-hidden
      >
        <circle cx="172" cy="28" r="26" stroke="currentColor" strokeWidth="3" />
        <circle cx="172" cy="28" r="15" stroke="currentColor" strokeWidth="3" />
        <path d="M112 112 q14 -16 28 0 t28 0 t28 0 t28 0" stroke="currentColor" strokeWidth="3" />
        <path d="M112 103 q14 -16 28 0 t28 0 t28 0 t28 0" stroke="currentColor" strokeWidth="3" />
        <g fill="currentColor">
          <circle cx="116" cy="18" r="2" /><circle cx="128" cy="18" r="2" /><circle cx="140" cy="18" r="2" />
          <circle cx="116" cy="30" r="2" /><circle cx="128" cy="30" r="2" /><circle cx="140" cy="30" r="2" />
          <circle cx="116" cy="42" r="2" /><circle cx="128" cy="42" r="2" /><circle cx="140" cy="42" r="2" />
        </g>
      </svg>

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gc-amber,#B45309)] px-2.5 py-1 text-[11px] font-bold text-white">
            ★ 수험생 추천템
          </span>
          <span className="text-[11px] font-semibold text-slate-400">AD · 쿠팡파트너스</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <img
            src={book.image}
            alt={book.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={hideOnError}
            className="h-24 w-24 shrink-0 object-contain drop-shadow-md sm:h-36 sm:w-36"
          />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-3 font-serif-kr text-lg font-extrabold leading-tight text-slate-900 sm:text-[26px] sm:leading-[1.15]">
              {book.title}
            </div>
            <div className="mt-3 sm:mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ED7029] to-[#d9601c] px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition group-hover:brightness-105 sm:px-6 sm:py-3 sm:text-base">
                쿠팡 최저가 보기 <span aria-hidden>→</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

interface CoupangProductRowProps {
  /** 추천 상품 목록. 1권 랜덤 노출. */
  products?: CoupangBook[];
  /** coupang-products.ts 카테고리 키 (예: "history"). */
  category?: string;
  heading?: string;
  className?: string;
}

/**
 * 맥락형 추천 상품 줄 — 헤딩 + 상품 위젯들(가로 스크롤) + 수수료 고지.
 * 상품이 하나도 없으면 통째로 null.
 */
export function CoupangProductRow({
  products,
  category,
  heading = "수험생 추천템",
  className = "",
}: CoupangProductRowProps) {
  // category 전달 시 동적 import 대신 호출부에서 products 를 넘기는 패턴 권장.
  const list = products ?? [];
  // 여러 개여도 1권만 랜덤 노출 (한꺼번에 5개 = 지저분 → 매 로드 1권 회전).
  // SSR/hydration 은 [0] 으로 일치, mount 후 클라에서 랜덤 교체(미스매치 방지).
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (list.length > 1) setIdx(Math.floor(Math.random() * list.length));
  }, [list.length]);
  if (list.length === 0) return null;
  const book = list[Math.min(idx, list.length - 1)];

  return (
    <section
      className={`mx-auto w-full max-w-3xl ${className}`}
      aria-label={heading}
      data-coupang-category={category}
    >
      {/* 배너형 카드 1개 (매 로드 랜덤 회전) — 추천핀·AD 라벨은 배너 내부 */}
      <CoupangCard book={book} variant="horizontal" />
      <p className="mt-2 px-1 text-[10px] leading-relaxed text-slate-400">{COUPANG_DISCLOSURE}</p>
    </section>
  );
}

export default CoupangAd;
