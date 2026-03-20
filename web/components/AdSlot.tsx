"use client";

import { useEffect, useRef } from "react";

type AdSize = "banner" | "rectangle" | "leaderboard" | "skyscraper" | "large-skyscraper";

const SIZE_MAP: Record<AdSize, { width: number; height: number }> = {
  banner: { width: 320, height: 100 },
  rectangle: { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
  skyscraper: { width: 160, height: 600 },
  "large-skyscraper": { width: 300, height: 600 },
};

interface AdSlotProps {
  size: AdSize;
  slot?: string;
  className?: string;
}

const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";

export default function AdSlot({ size, slot, className = "" }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const { width, height } = SIZE_MAP[size];

  useEffect(() => {
    if (!ADSENSE_ENABLED || !slot || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, [slot]);

  // Don't render anything if AdSense is not enabled
  if (!ADSENSE_ENABLED || !slot) return null;

  return (
    <div className={`flex justify-center ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "inline-block", width, height }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
      />
    </div>
  );
}
