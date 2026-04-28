"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Universal Ad Slot — AdSense + 카카오 애드핏 (AdFit) 동시 지원.
 *
 * Provider 결정:
 *   - provider="adsense"  → AdSense만 (디바이스 무관)
 *   - provider="adfit"    → AdFit만 (디바이스 무관)
 *   - provider="auto"     → 모바일은 AdFit / 데스크톱은 AdSense (기본값)
 *
 * 'auto' fallback 규칙:
 *   - 디바이스 매칭 provider 없으면 다른 provider로 fallback
 *   - 둘 다 없으면 null (광고 안 뜸)
 *
 * Backward compat:
 *   - 기존 `<AdSlot size="rectangle" slot={X} />` 그대로 작동 (AdSense slot)
 *
 * Spec 문서: docs/multi-exam-hub-strategy-v3.html §05 / monetization-alternatives.html
 */

type AdSize = "banner" | "rectangle" | "leaderboard" | "skyscraper" | "large-skyscraper";
type Provider = "adsense" | "adfit" | "auto";

const SIZE_MAP: Record<AdSize, { width: number; height: number }> = {
  banner: { width: 320, height: 100 },
  rectangle: { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
  skyscraper: { width: 160, height: 600 },
  "large-skyscraper": { width: 300, height: 600 },
};

interface AdSlotProps {
  size: AdSize;
  /** Provider 명시. 'auto' (default) = 모바일 AdFit / 데스크톱 AdSense */
  provider?: Provider;
  /** AdSense slot ID. 미제공 시 'slot' prop으로 fallback */
  adsenseSlot?: string;
  /** AdFit unit ID. 미제공 시 size별 ENV 기본값 사용 */
  adfitUnit?: string;
  /** @deprecated AdSense slot ID — `adsenseSlot` 권장 (backward compat) */
  slot?: string;
  className?: string;
}

const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-6002059361162458";

const ADFIT_ENABLED = process.env.NEXT_PUBLIC_ADFIT_ENABLED === "true";
const ADFIT_UNITS: Partial<Record<AdSize, string | undefined>> = {
  rectangle: process.env.NEXT_PUBLIC_ADFIT_UNIT_RECTANGLE,
  banner: process.env.NEXT_PUBLIC_ADFIT_UNIT_BANNER,
  leaderboard: process.env.NEXT_PUBLIC_ADFIT_UNIT_BANNER,
  skyscraper: process.env.NEXT_PUBLIC_ADFIT_UNIT_SIDE,
  "large-skyscraper": process.env.NEXT_PUBLIC_ADFIT_UNIT_SIDE,
};

const MOBILE_BREAKPOINT = 768;

function pickAutoProvider(adsenseAvailable: boolean, adfitAvailable: boolean): "adsense" | "adfit" | null {
  if (typeof window === "undefined") return null;
  if (!adsenseAvailable) return adfitAvailable ? "adfit" : null;
  if (!adfitAvailable) return "adsense";
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  return isMobile ? "adfit" : "adsense";
}

export default function AdSlot({
  size,
  provider: providerProp = "auto",
  adsenseSlot,
  adfitUnit,
  slot,
  className = "",
}: AdSlotProps) {
  const { width, height } = SIZE_MAP[size];
  const adsenseId = adsenseSlot ?? slot;
  const adfitId = adfitUnit ?? ADFIT_UNITS[size];

  const adsenseAvailable = ADSENSE_ENABLED && Boolean(adsenseId);
  const adfitAvailable = ADFIT_ENABLED && Boolean(adfitId);

  const [resolvedProvider, setResolvedProvider] = useState<"adsense" | "adfit" | null>(null);
  const adsensePushed = useRef(false);

  // Resolve provider on mount (client-side only — avoids hydration mismatch)
  useEffect(() => {
    if (providerProp === "auto") {
      setResolvedProvider(pickAutoProvider(adsenseAvailable, adfitAvailable));
    } else if (providerProp === "adsense" && adsenseAvailable) {
      setResolvedProvider("adsense");
    } else if (providerProp === "adfit" && adfitAvailable) {
      setResolvedProvider("adfit");
    } else {
      setResolvedProvider(null);
    }
  }, [providerProp, adsenseAvailable, adfitAvailable]);

  // AdSense push (only when provider resolved to adsense)
  useEffect(() => {
    if (resolvedProvider !== "adsense" || adsensePushed.current) return;
    try {
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []).push({});
      adsensePushed.current = true;
    } catch {}
  }, [resolvedProvider]);

  if (!resolvedProvider) return null;

  return (
    <div className={`flex justify-center ${className}`} style={{ minHeight: height }}>
      {resolvedProvider === "adsense" && (
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width, height }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={adsenseId}
        />
      )}
      {resolvedProvider === "adfit" && (
        <ins
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit={adfitId}
          data-ad-width={width.toString()}
          data-ad-height={height.toString()}
        />
      )}
    </div>
  );
}
