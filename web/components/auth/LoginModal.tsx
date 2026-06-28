"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  signInWithEmailLink,
  signInWithGoogle,
  signInWithKakao,
} from "@/lib/auth";

export default function LoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) {
      setSent(false);
      setMsg(null);
      setBusy(null);
    }
  }, [open]);

  if (!mounted || !open) return null;

  const social = async (which: "kakao" | "google") => {
    setMsg(null);
    setBusy(which);
    try {
      const fn = which === "kakao" ? signInWithKakao : signInWithGoogle;
      const { error } = await fn();
      if (error)
        setMsg(
          `${which === "kakao" ? "카카오" : "구글"} 로그인은 Supabase 프로바이더 설정 후 작동해요. 지금은 이메일로 로그인해보세요.`
        );
    } catch {
      setMsg("로그인 중 오류가 발생했어요.");
    }
    setBusy(null);
  };

  const emailLink = async () => {
    if (!email.includes("@")) {
      setMsg("이메일 주소를 확인해주세요.");
      return;
    }
    setMsg(null);
    setBusy("email");
    try {
      const { error } = await signInWithEmailLink(email.trim());
      if (error) setMsg(error.message);
      else setSent(true);
    } catch {
      setMsg("전송에 실패했어요.");
    }
    setBusy(null);
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
          maxWidth: 384,
          padding: "28px 26px",
          boxShadow: "0 30px 70px -24px rgba(0,0,0,.55)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            className="font-serif-kr"
            style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em" }}
          >
            기출노트 로그인
          </div>
          <div style={{ fontSize: 13, color: "var(--gc-subtle)", marginTop: 4 }}>
            가입 즉시 프리미엄 7일 무료 · 기록은 기기 간 저장
          </div>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "20px 4px" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>📬</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              로그인 링크를 보냈어요
            </div>
            <div style={{ fontSize: 13, color: "var(--gc-subtle)", lineHeight: 1.6 }}>
              <b>{email}</b> 메일함에서 링크를 누르면 로그인돼요.
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => social("kakao")}
              disabled={busy !== null}
              style={{ ...socialBtn, background: "#FEE500", color: "#191600" }}
            >
              {busy === "kakao" ? "연결 중…" : "💬  카카오로 계속하기"}
            </button>
            <button
              onClick={() => social("google")}
              disabled={busy !== null}
              style={{
                ...socialBtn,
                background: "#fff",
                color: "var(--gc-ink)",
                border: "1.5px solid var(--gc-hairline)",
              }}
            >
              {busy === "google" ? "연결 중…" : "🔵  구글로 계속하기"}
            </button>

            <div style={dividerWrap}>
              <span style={dividerLine} />
              <span style={{ fontSize: 11.5, color: "var(--gc-subtle)" }}>또는 이메일</span>
              <span style={dividerLine} />
            </div>

            <input
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && emailLink()}
              style={{
                width: "100%",
                border: "1.5px solid var(--gc-hairline)",
                borderRadius: 11,
                padding: "11px 13px",
                fontSize: 14,
                fontFamily: "inherit",
                marginBottom: 9,
                background: "#fff",
              }}
            />
            <button
              onClick={emailLink}
              disabled={busy !== null}
              style={{ ...socialBtn, background: "var(--gc-amber)", color: "#fff", marginBottom: 0 }}
            >
              {busy === "email" ? "전송 중…" : "이메일로 로그인 링크 받기"}
            </button>
          </>
        )}

        {msg && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12.5,
              color: "var(--gc-amber)",
              background: "var(--gc-amber-soft)",
              borderRadius: 10,
              padding: "9px 12px",
              lineHeight: 1.5,
            }}
          >
            {msg}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 14,
            width: "100%",
            background: "none",
            border: "none",
            color: "var(--gc-subtle)",
            fontSize: 12.5,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          닫기
        </button>
      </div>
    </div>,
    document.body
  );
}

const socialBtn: React.CSSProperties = {
  width: "100%",
  fontFamily: "inherit",
  fontSize: 14.5,
  fontWeight: 800,
  border: "none",
  borderRadius: 12,
  padding: "12px",
  cursor: "pointer",
  marginBottom: 9,
};
const dividerWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "16px 0 14px",
};
const dividerLine: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--gc-hairline)",
};
