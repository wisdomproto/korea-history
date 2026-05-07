"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Env = "android" | "ios" | "inapp" | "desktop" | "unknown";

interface Props {
  env: Env;
  open: boolean;
  onClose: () => void;
  onAlreadyInstalled?: () => void;
}

export default function PWAInstallModal({ env, open, onClose, onAlreadyInstalled }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      style={{
        background: "rgba(20, 15, 10, 0.55)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(440px, calc(100% - 32px))",
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          background: "#FAF6EE",
          borderRadius: 20,
          boxShadow: "0 10px 40px rgba(20,15,10,0.25)",
          padding: "24px 24px 32px",
          fontFamily: "var(--gc-font-sans)",
          color: "var(--gc-ink)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="md:hidden mx-auto"
          style={{
            width: 40,
            height: 4,
            background: "var(--gc-hairline)",
            borderRadius: 2,
            marginBottom: 16,
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              className="font-mono-kr"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--gc-amber)",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              INSTALL · 홈 화면에 추가
            </div>
            <h2
              className="font-serif-kr"
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
              }}
            >
              {env === "ios" && "홈 화면에 기출노트 추가"}
              {env === "inapp" && "외부 브라우저로 열어주세요"}
              {(env === "desktop" || env === "android" || env === "unknown") &&
                "홈 화면에 기출노트 추가"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "var(--gc-hairline)",
              color: "var(--gc-ink)",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body — 환경별 분기 */}
        {env === "ios" && <IOSGuide />}
        {env === "inapp" && <InAppGuide />}
        {(env === "desktop" || env === "unknown") && <DesktopGuide />}
        {env === "android" && <AndroidFallback />}

        {/* 공통 혜택 */}
        <div
          style={{
            marginTop: 20,
            padding: 14,
            background: "var(--gc-bg)",
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--gc-subtle)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "var(--gc-ink)",
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            홈 화면에 추가하면
          </div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li>홈 화면에서 한 번에 학습 시작</li>
            <li>풀스크린으로 몰입 — 브라우저 UI 없음</li>
            <li>재방문 시 빠른 로딩</li>
          </ul>
        </div>

        {/* 이미 설치한 사용자용 dismiss — iOS는 자동 감지 불가, 수동 경로 */}
        {onAlreadyInstalled && env !== "inapp" && (
          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              borderTop: "1px solid var(--gc-hairline)",
              paddingTop: 14,
            }}
          >
            <button
              onClick={onAlreadyInstalled}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--gc-subtle)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: "var(--gc-font-sans)",
              }}
            >
              이미 설치했어요 — 다시 안 보이게
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function IOSGuide() {
  return (
    <ol
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <Step
        n={1}
        title="하단 공유 버튼 누르기"
        desc="사파리 화면 하단의 공유 아이콘"
        icon={
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gc-amber)" }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        }
      />
      <Step
        n={2}
        title="“홈 화면에 추가” 선택"
        desc="목록을 아래로 스크롤하면 보입니다"
        icon={
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gc-teal)" }}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        }
      />
      <Step
        n={3}
        title="우측 상단 “추가” 누르기"
        desc="홈 화면에 기출노트 아이콘이 생깁니다"
        icon={<span style={{ fontSize: 26 }}>✅</span>}
      />
      <p
        style={{
          fontSize: 12,
          color: "var(--gc-subtle)",
          marginTop: 6,
          lineHeight: 1.6,
        }}
      >
        ⚠️ 크롬/네이버 앱 등 다른 브라우저로 보고 있다면 사파리에서 다시 열어주세요.
      </p>
    </ol>
  );
}

function InAppGuide() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--gc-ink)" }}>
        지금 보고 계신 화면은 <b>인스타그램·카카오톡 등의 앱 안에 있는 브라우저</b>예요.
        이 환경에서는 홈 화면 추가가 동작하지 않습니다.
      </p>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <Step
          n={1}
          title="우측 상단 메뉴(⋯) 누르기"
          desc="3점 또는 ⋮ 아이콘"
          icon={<span style={{ fontSize: 24 }}>⋯</span>}
        />
        <Step
          n={2}
          title="“다른 브라우저로 열기” 선택"
          desc="Safari·Chrome·Samsung 인터넷 등"
          icon={<span style={{ fontSize: 24 }}>🌐</span>}
        />
        <Step
          n={3}
          title="브라우저에서 다시 ‘앱 설치’ 누르기"
          desc="자동으로 설치 안내가 뜹니다"
          icon={<span style={{ fontSize: 24 }}>📱</span>}
        />
      </ol>
    </div>
  );
}

function DesktopGuide() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--gc-ink)" }}>
        데스크톱 크롬/엣지에서는 주소창 우측의 <b>설치 아이콘</b>을 누르면 설치할 수 있어요.
      </p>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <Step
          n={1}
          title="주소창 우측 ⊕ 또는 ⤓ 아이콘 클릭"
          desc="크롬/엣지에서 자동으로 표시됩니다"
          icon={<span style={{ fontSize: 24 }}>⊕</span>}
        />
        <Step
          n={2}
          title="“설치” 클릭"
          desc="앱처럼 별도 창으로 실행됩니다"
          icon={<span style={{ fontSize: 24 }}>💻</span>}
        />
      </ol>
    </div>
  );
}

function AndroidFallback() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--gc-ink)" }}>
        브라우저에서 install prompt 호출에 실패했어요. 다음 방법으로 시도해 주세요:
      </p>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <Step
          n={1}
          title="우측 상단 메뉴(⋮) 누르기"
          desc="크롬/삼성 인터넷"
          icon={<span style={{ fontSize: 24 }}>⋮</span>}
        />
        <Step
          n={2}
          title="“앱 설치” 또는 “홈 화면에 추가”"
          desc="브라우저에 따라 명칭이 다를 수 있습니다"
          icon={<span style={{ fontSize: 24 }}>📱</span>}
        />
      </ol>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
  icon,
}: {
  n: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 14,
        background: "var(--gc-paper)",
        border: "1px solid var(--gc-hairline)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 999,
          background: "var(--gc-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--gc-font-mono)",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--gc-amber)",
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--gc-subtle)", lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{icon}</div>
    </li>
  );
}
