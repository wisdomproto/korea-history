"use client";

import { useEffect, useState } from "react";
import PWAInstallModal from "./PWAInstallModal";

type Env = "android" | "ios" | "inapp" | "desktop" | "unknown";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "gcnote_pwa_installed";

function isMarkedInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markInstalled() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // private mode 등 — silently ignore
  }
}

function detectEnv(): { env: Env; isInstalled: boolean } {
  if (typeof window === "undefined") return { env: "unknown", isInstalled: false };

  const ua = navigator.userAgent || "";
  const isInstalled =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  // 인스타/카톡/페이스북/네이버 등 인앱 브라우저 — install 차단
  const isInApp =
    /Instagram|FB_IAB|FBAN|FBAV|KAKAOTALK|NAVER\(inapp|Line\//i.test(ua);
  if (isInApp) return { env: "inapp", isInstalled };

  const isIOS = /iPhone|iPad|iPod/i.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
  if (isIOS) return { env: "ios", isInstalled };

  const isAndroid = /Android/i.test(ua);
  if (isAndroid) return { env: "android", isInstalled };

  return { env: "desktop", isInstalled };
}

interface Props {
  variant?: "desktop" | "mobile";
}

export default function PWAInstallButton({ variant = "desktop" }: Props) {
  const [env, setEnv] = useState<Env>("unknown");
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const detected = detectEnv();
    setEnv(detected.env);
    // localStorage flag (영구 dismiss) 우선 — display-mode 감지 불가한 일반 브라우저 케이스 보완
    if (isMarkedInstalled()) {
      setIsInstalled(true);
    } else {
      setIsInstalled(detected.isInstalled);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      markInstalled();
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // 이미 설치됐거나 환경 미정이면 버튼 숨김
  if (isInstalled || env === "unknown") return null;

  const onClick = async () => {
    if (env === "android" && deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          markInstalled();
        }
        setDeferredPrompt(null);
      } catch {
        setModalOpen(true);
      }
      return;
    }
    // iOS / 인앱 / 데스크톱(prompt 없음) → 가이드 모달
    setModalOpen(true);
  };

  const onAlreadyInstalled = () => {
    setIsInstalled(true);
    markInstalled();
    setModalOpen(false);
  };

  if (variant === "mobile") {
    return (
      <>
        <button
          onClick={onClick}
          className="md:hidden flex font-sans-kr items-center shrink-0 transition-all"
          style={{
            padding: "4px 10px 4px 4px",
            fontSize: 13,
            fontWeight: 700,
            color: "#FFFFFF",
            background:
              "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)",
            borderRadius: 999,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            boxShadow:
              "0 3px 8px rgba(180, 83, 9, 0.3), 0 1px 2px rgba(180, 83, 9, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
            border: "none",
            cursor: "pointer",
            gap: 7,
          }}
          aria-label="홈 화면에 추가"
        >
          {/* 좌측 흰색 원 + 플러스 */}
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 1px 2px rgba(120, 50, 0, 0.18)",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B45309"
              strokeWidth={3.5}
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          {/* 가운데 텍스트 */}
          <span style={{ paddingRight: 4 }}>홈 화면에 추가</span>
        </button>
        <PWAInstallModal
          env={env}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onAlreadyInstalled={onAlreadyInstalled}
        />
      </>
    );
  }

  // desktop
  return (
    <>
      <button
        onClick={onClick}
        className="hidden md:flex font-sans-kr items-center shrink-0 no-underline transition-all"
        style={{
          padding: "5px 12px 5px 5px",
          fontSize: 14,
          fontWeight: 700,
          color: "#FFFFFF",
          background:
            "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)",
          borderRadius: 999,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
          boxShadow:
            "0 4px 12px rgba(180, 83, 9, 0.28), 0 1px 2px rgba(180, 83, 9, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
          border: "none",
          cursor: "pointer",
          gap: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 6px 18px rgba(180, 83, 9, 0.4), 0 2px 4px rgba(180, 83, 9, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(180, 83, 9, 0.28), 0 1px 2px rgba(180, 83, 9, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)";
        }}
        aria-label="홈 화면에 추가"
      >
        {/* 좌측 흰색 원 + 플러스 */}
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 1px 2px rgba(120, 50, 0, 0.18)",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B45309"
            strokeWidth={3.5}
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        {/* 가운데 텍스트 */}
        <span>홈 화면에 추가</span>
        {/* 세로 디바이더 */}
        <span
          style={{
            width: 1,
            height: 16,
            background: "rgba(255, 255, 255, 0.45)",
            flexShrink: 0,
          }}
        />
        {/* 우측 다운로드 아이콘 */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      <PWAInstallModal env={env} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
