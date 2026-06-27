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

interface CoupangProductRowProps {
  /** 직접 product src 배열 전달 (우선). 없으면 category 로 조회. */
  products?: string[];
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
  if (list.length === 0) return null;

  return (
    <section
      className={`mx-auto w-full max-w-3xl rounded-2xl border border-[var(--gc-hairline,#e5ddcf)] bg-[var(--gc-paper,#fff)] p-4 ${className}`}
      aria-label={heading}
      data-coupang-category={category}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-[var(--gc-amber,#B45309)]">
          📚 {heading}
        </span>
        <span className="text-[10px] text-slate-400">AD · 쿠팡파트너스</span>
      </div>
      {/* 적응형: 카드 자체가 breakpoint 별로 커지고(CoupangProduct), 가운데 정렬 +
          줄바꿈 — 1개면 가운데(휑함 없음), 여러 개면 화면 폭만큼 채우고 다음 줄로. */}
      <div className="flex flex-wrap justify-center gap-3 pb-1">
        {list.map((src) => (
          <CoupangProduct key={src} src={src} />
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{COUPANG_DISCLOSURE}</p>
    </section>
  );
}

export default CoupangAd;
