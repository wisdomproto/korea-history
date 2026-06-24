"use client";

import { useState } from "react";

/** F2P 마찰 프롬프트 mock — 하루 무료 한도 도달 시 "광고 보고 계속 / 프리미엄". */
export default function FrictionDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 14,
          border: "2px solid var(--gc-ink)",
          background: "var(--gc-paper)",
          color: "var(--gc-ink)",
          padding: "11px 18px",
          borderRadius: 12,
          cursor: "pointer",
        }}
      >
        ⚡ 마찰 프롬프트 미리보기
      </button>

      {open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(31,26,20,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 60,
          }}
        >
          <div
            style={{
              background: "var(--gc-paper)",
              borderRadius: 20,
              maxWidth: 380,
              width: "100%",
              padding: 26,
              textAlign: "center",
              boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)",
            }}
          >
            <div style={{ fontSize: 38, marginBottom: 8 }}>🔥</div>
            <h3
              className="font-serif-kr"
              style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}
            >
              오늘 무료 문제 다 풀었어요!
            </h3>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--gc-subtle)",
                lineHeight: 1.6,
                margin: "0 0 18px",
              }}
            >
              내일 다시 채워지거나, 지금 바로 더 풀 수 있어요.
            </p>

            <button
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: 14,
                background: "var(--gc-ink)",
                color: "var(--gc-paper)",
                border: "none",
                borderRadius: 12,
                padding: 13,
                cursor: "pointer",
                marginBottom: 9,
              }}
            >
              📺 광고 보고 10문제 더 풀기
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: 14,
                background: "var(--gc-amber)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: 13,
                cursor: "pointer",
              }}
            >
              ✨ 프리미엄 — 광고 없이 무제한
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: "var(--gc-subtle)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
