// 헤더 직후 자동 롤링 공지 띠.
// - 5초 간격 회전, hover/focus 시 일시정지
// - ✕ 클릭 시 24시간 dismiss (localStorage)
// - expiresAt 지난 메시지 자동 제외 (lib/announcements.ts)
// - SEO: H1/H2 미사용, aria-live="polite", JSON-LD 미주입

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getActiveAnnouncements } from "@/lib/announcements";

const ROTATE_MS = 5000;
const DISMISS_HOURS = 24;
const DISMISS_KEY = "announcement_dismissed_until";

export default function AnnouncementBar() {
  const items = useMemo(() => getActiveAnnouncements(), []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // dismiss state 초기화 (localStorage 확인)
  useEffect(() => {
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < Number(until)) {
        setDismissed(true);
      }
    } catch {}
  }, []);

  // 자동 회전
  useEffect(() => {
    if (items.length <= 1 || paused || dismissed) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length, paused, dismissed]);

  if (dismissed || items.length === 0) return null;

  const current = items[index];

  const dismiss = () => {
    try {
      const until = Date.now() + DISMISS_HOURS * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {}
    setDismissed(true);
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="사이트 공지"
      className="w-full sticky z-30"
      style={{
        // Header 높이(68px) 직하 — 스크롤해도 항상 viewport 상단 노출
        top: 68,
        background: "var(--gc-amber)",
        color: "var(--gc-ink)",
        borderBottom: "1px solid var(--gc-ink)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl flex items-center gap-3 px-4 h-12 md:h-14 text-sm md:text-base">
        <Link
          key={current.id}
          href={current.href}
          className="flex-1 min-w-0 flex items-center gap-2.5 truncate hover:underline font-serif-kr"
          style={{
            color: "var(--gc-paper)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            animation: "fadeInUp 0.45s ease-out",
          }}
        >
          {current.emoji && (
            <span
              aria-hidden
              className="text-lg md:text-xl shrink-0 inline-block"
              style={{ animation: "bounce-subtle 0.9s ease-in-out" }}
            >
              {current.emoji}
            </span>
          )}
          <span className="truncate">{current.text}</span>
        </Link>

        {/* 도트 인디케이터 (메시지 2개 이상일 때만, 데스크탑에서만) */}
        {items.length > 1 && (
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {items.map((_, i) => (
              <button
                key={i}
                aria-label={`공지 ${i + 1}로 이동`}
                onClick={() => setIndex(i)}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === index ? 18 : 8,
                  background: "var(--gc-paper)",
                  opacity: i === index ? 1 : 0.45,
                }}
              />
            ))}
          </div>
        )}

        <button
          aria-label="공지 닫기 (24시간)"
          onClick={dismiss}
          className="shrink-0 px-2 py-1 leading-none transition-opacity text-lg"
          style={{ color: "var(--gc-paper)", opacity: 0.75 }}
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
