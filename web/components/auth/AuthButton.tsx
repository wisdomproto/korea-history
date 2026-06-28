"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function AuthButton() {
  const { user, loading, isPremium, openLogin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) {
    return <div style={{ width: 34, height: 34 }} aria-hidden />;
  }

  if (!user) {
    return (
      <button
        onClick={openLogin}
        className="shrink-0"
        style={{
          fontFamily: "var(--gc-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          color: "#fff",
          background: "var(--gc-amber)",
          border: "none",
          borderRadius: 999,
          padding: "7px 15px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        로그인
      </button>
    );
  }

  const label = (user.email ?? user.user_metadata?.name ?? "U") as string;
  const initial = label.trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }} className="shrink-0">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="내 계정"
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          background: isPremium ? "var(--gc-amber)" : "var(--gc-ink)",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {initial}
      </button>

      {menuOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            background: "var(--gc-paper)",
            border: "1px solid var(--gc-hairline)",
            borderRadius: 14,
            boxShadow: "0 18px 40px -16px rgba(0,0,0,.3)",
            minWidth: 200,
            padding: 8,
            zIndex: 60,
          }}
        >
          <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid var(--gc-hairline)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, wordBreak: "break-all" }}>{label}</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                marginTop: 3,
                color: isPremium ? "var(--gc-amber)" : "var(--gc-subtle)",
              }}
            >
              {isPremium ? "💎 프리미엄" : "무료 회원"}
            </div>
          </div>
          <button onClick={() => { signOut(); setMenuOpen(false); }} style={menuItem}>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

const menuItem: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "none",
  border: "none",
  fontFamily: "var(--gc-font-sans)",
  fontSize: 13.5,
  color: "var(--gc-ink)",
  padding: "10px 10px",
  cursor: "pointer",
  borderRadius: 8,
};
