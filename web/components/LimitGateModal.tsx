"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { CoupangProductRow } from "@/components/CoupangAd";
import { getCoupangProducts } from "@/lib/coupang-products";
import { addRefill, REFILL_AMOUNT } from "@/lib/daily-limit";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * 하루 무료 한도 도달 시 뜨는 마찰 게이트.
 *  - 쿠팡 추천템(광고) 노출 → "보고 계속 풀기" = 한도 +REFILL_AMOUNT 충전
 *  - 프리미엄 = 로그인(가입 시 7일 트라이얼 자동) 유도
 *  - 나중에 = 닫기
 */
export default function LimitGateModal({
  open,
  onClose,
  onRefilled,
  coupangCategory = "history",
}: {
  open: boolean;
  onClose: () => void;
  onRefilled?: () => void;
  coupangCategory?: string;
}) {
  const { openLogin } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const refill = () => {
    addRefill();
    onRefilled?.();
    onClose();
  };
  const goPremium = () => {
    onClose();
    openLogin();
  };

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31,26,20,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "var(--gc-paper)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          padding: "26px 24px",
          textAlign: "center",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 38, marginBottom: 6 }}>🔥</div>
        <h3 className="font-serif-kr" style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
          오늘 무료 문제를 다 풀었어요!
        </h3>
        <p style={{ fontSize: 13.5, color: "var(--gc-subtle)", lineHeight: 1.6, margin: "0 0 16px" }}>
          내일 자정에 다시 채워져요. 지금 더 풀려면 아래 추천템을 둘러보거나 프리미엄으로 무제한 이용하세요.
        </p>

        <CoupangProductRow products={getCoupangProducts(coupangCategory)} className="mb-4" />

        <button onClick={refill} style={{ ...btn, background: "var(--gc-ink)", color: "var(--gc-paper)" }}>
          📚 추천템 보고 계속 풀기 (+{REFILL_AMOUNT}문제)
        </button>
        <button onClick={goPremium} style={{ ...btn, background: "var(--gc-amber)", color: "#fff" }}>
          ✨ 프리미엄 — 광고 없이 무제한
        </button>
        <button
          onClick={onClose}
          style={{
            marginTop: 10,
            background: "none",
            border: "none",
            color: "var(--gc-subtle)",
            fontSize: 12.5,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          나중에
        </button>
      </div>
    </div>,
    document.body
  );
}

const btn: React.CSSProperties = {
  width: "100%",
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: 14,
  border: "none",
  borderRadius: 12,
  padding: 13,
  cursor: "pointer",
  marginBottom: 9,
};
