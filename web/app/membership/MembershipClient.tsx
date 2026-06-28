"use client";

import { useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  TOSS_CLIENT_KEY,
  BILLING_ENABLED,
  PLAN_NAME,
  PLAN_PRICE_KRW,
  toCustomerKey,
} from "@/lib/billing";

export default function MembershipClient() {
  const { user, isPremium, premiumUntil, loading, openLogin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const subscribe = async () => {
    setMsg(null);
    if (!user) {
      openLogin();
      return;
    }
    if (!BILLING_ENABLED) {
      setMsg("결제 기능을 준비 중입니다. 잠시만 기다려 주세요.");
      return;
    }
    setBusy(true);
    try {
      const toss = await loadTossPayments(TOSS_CLIENT_KEY);
      const customerKey = toCustomerKey(user.id);
      const payment = toss.payment({ customerKey });
      // 카드 등록 → successUrl(/api/billing/confirm)로 authKey·customerKey 자동 전달
      // (customerKey는 payment({customerKey})에 이미 지정 → requestBillingAuth 인자엔 불필요)
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/api/billing/confirm`,
        failUrl: `${window.location.origin}/membership?fail=1`,
      });
    } catch (e) {
      setMsg("결제 창을 여는 중 오류가 발생했어요. 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  const trialLabel =
    isPremium && premiumUntil
      ? `${new Date(premiumUntil).toLocaleDateString("ko-KR")}까지 이용`
      : null;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1
        className="font-serif-kr"
        style={{ fontSize: 28, fontWeight: 900, textAlign: "center", margin: "8px 0 6px" }}
      >
        광고 없이, 무제한으로.
      </h1>
      <p
        style={{
          textAlign: "center",
          color: "var(--gc-subtle)",
          fontSize: 14,
          lineHeight: 1.6,
          margin: "0 auto 24px",
          maxWidth: 440,
        }}
      >
        {PLAN_NAME}으로 모든 기출문제와 요약노트를 하루 한도·광고 없이 이용하세요.
      </p>

      {/* 프리미엄 카드 */}
      <div
        style={{
          background: "var(--gc-paper)",
          border: "2.5px solid var(--gc-amber)",
          borderRadius: 20,
          padding: "26px 24px",
          boxShadow: "0 14px 32px -14px rgba(180,83,9,.4)",
          textAlign: "center",
        }}
      >
        <h2 className="font-serif-kr" style={{ fontSize: 22, fontWeight: 800, color: "var(--gc-amber)", margin: "0 0 6px" }}>
          프리미엄
        </h2>
        <div className="font-serif-kr" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 900 }}>₩{PLAN_PRICE_KRW.toLocaleString()}</span>
          <span style={{ fontSize: 15, color: "var(--gc-subtle)" }}> / 월</span>
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "16px 0 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 14,
            textAlign: "left",
          }}
        >
          <li>★ 기출문제 <b>무제한 · 광고 없음</b></li>
          <li>★ 요약노트 <b>전체</b> + 문제↔노트 연결</li>
          <li>✓ 오답노트 · 기록 무제한</li>
          <li>✓ 하루 한도 해제</li>
        </ul>

        {loading ? (
          <div style={{ height: 48 }} aria-hidden />
        ) : isPremium ? (
          <div
            style={{
              background: "var(--gc-amber-soft)",
              color: "var(--gc-amber)",
              borderRadius: 12,
              padding: "13px",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            💎 이미 프리미엄 이용 중{trialLabel ? ` · ${trialLabel}` : ""}
          </div>
        ) : (
          <button
            onClick={subscribe}
            disabled={busy}
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: 15,
              background: "var(--gc-amber)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: 14,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "결제창 여는 중…" : user ? "프리미엄 구독하기" : "로그인하고 구독하기"}
          </button>
        )}

        {!BILLING_ENABLED && !isPremium && (
          <p style={{ fontSize: 11.5, color: "var(--gc-subtle)", marginTop: 10 }}>
            * 결제 연동 준비 중 — 곧 오픈됩니다.
          </p>
        )}
        {msg && (
          <p style={{ fontSize: 12.5, color: "var(--gc-amber)", marginTop: 10 }}>{msg}</p>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--gc-subtle)", marginTop: 14, lineHeight: 1.6 }}>
        가입 즉시 7일 무료 체험 · 언제든 해지 가능 · 카드 등록 후 매월 자동 결제
      </p>
    </div>
  );
}
