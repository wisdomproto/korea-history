"use client";

import { useState } from "react";

type View = "guest" | "premium";

export default function NotePreviewDemo({
  noteTitle,
  eraLabel,
  html,
  relatedCount,
}: {
  noteTitle: string;
  eraLabel: string;
  html: string;
  relatedCount: number;
}) {
  const [view, setView] = useState<View>("guest");
  const isGuest = view === "guest";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* 시점 토글 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 18,
          background: "var(--gc-paper)",
          border: "1.5px solid var(--gc-hairline)",
          borderRadius: 14,
          padding: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--gc-subtle)", fontWeight: 700, marginRight: 2 }}>
          보는 시점:
        </span>
        <Toggle active={isGuest} onClick={() => setView("guest")} label="🔓 비로그인/무료" />
        <Toggle active={!isGuest} onClick={() => setView("premium")} label="💎 프리미엄" />
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--gc-subtle)" }}>
          {isGuest ? "미리보기 + 로그인 유도" : "전체 공개 · 광고 없음"}
        </span>
      </div>

      {/* 노트 헤더 */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{noteTitle}</h1>
        <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
          <span style={{ background: "var(--gc-teal)", color: "#fff", borderRadius: 999, padding: "2px 10px", fontWeight: 700 }}>
            {eraLabel}
          </span>
          {relatedCount > 0 && (
            <span style={{ background: "var(--gc-bg-deep)", color: "var(--gc-subtle)", borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>
              관련 기출 {relatedCount}문제
            </span>
          )}
        </div>
      </div>

      {/* 문제↔노트 연결 — 게스트는 티저 / 프리미엄은 활성 */}
      <div
        style={{
          margin: "14px 0",
          border: `1.5px solid ${isGuest ? "var(--gc-hairline)" : "var(--gc-amber)"}`,
          background: isGuest ? "var(--gc-paper)" : "var(--gc-amber-soft)",
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 20 }}>📝</span>
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>
          관련 요약노트 · 문제 연결
          <div style={{ fontSize: 11.5, color: "var(--gc-subtle)", fontWeight: 500 }}>
            {isGuest ? "로그인하면 이 노트와 연결된 기출을 바로 풀 수 있어요" : "연결된 기출 풀기 · 약점 자동 연결"}
          </div>
        </div>
        {isGuest ? (
          <span style={{ background: "var(--gc-amber)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "6px 12px", borderRadius: 999 }}>
            로그인 · 7일 무료
          </span>
        ) : (
          <span style={{ color: "var(--gc-amber)", fontSize: 13, fontWeight: 800 }}>열기 →</span>
        )}
      </div>

      {/* 본문 — 게스트면 클립 + 게이트, 프리미엄이면 전체 */}
      <div style={{ position: "relative" }}>
        <div
          className="note-content"
          style={
            isGuest
              ? { maxHeight: 360, overflow: "hidden", maskImage: "linear-gradient(180deg,#000 60%,transparent)", WebkitMaskImage: "linear-gradient(180deg,#000 60%,transparent)" }
              : undefined
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {isGuest && (
          <div
            style={{
              position: "relative",
              marginTop: -40,
              background: "var(--gc-paper)",
              border: "1.5px solid var(--gc-hairline)",
              borderRadius: 18,
              padding: "26px 22px",
              textAlign: "center",
              boxShadow: "0 -20px 40px -24px rgba(0,0,0,.18)",
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 6 }}>📖</div>
            <h3 className="font-serif-kr" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 6px" }}>
              로그인하고 전체 요약노트 보기
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--gc-subtle)", lineHeight: 1.6, margin: "0 0 16px" }}>
              가입하면 <b>7일간 무료</b>로 전체 노트 + 문제 연결까지 모두 열려요. 카드 등록 없이.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ background: "var(--gc-amber)", color: "#fff", fontWeight: 800, fontSize: 14, padding: "11px 20px", borderRadius: 12 }}>
                💬 카카오로 시작
              </span>
              <span style={{ background: "var(--gc-paper)", color: "var(--gc-ink)", border: "2px solid var(--gc-ink)", fontWeight: 800, fontSize: 14, padding: "11px 20px", borderRadius: 12 }}>
                구글로 시작
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--gc-subtle)", marginTop: 12 }}>
              검색엔진·미리보기는 그대로 노출돼 SEO는 유지됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
        padding: "7px 13px",
        borderRadius: 10,
        border: active ? "2px solid var(--gc-amber)" : "1.5px solid var(--gc-hairline)",
        background: active ? "var(--gc-amber-soft)" : "var(--gc-paper)",
        color: active ? "var(--gc-amber)" : "var(--gc-subtle)",
      }}
    >
      {label}
    </button>
  );
}
