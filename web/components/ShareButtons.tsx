"use client";

import { useState, useEffect } from "react";

interface ShareButtonsProps {
  title: string;
  description: string;
  url?: string;
  /** Kakao link message button text */
  buttonText?: string;
}

/**
 * Share buttons: KakaoTalk + Copy Link + Native Share (mobile)
 */
export default function ShareButtons({
  title,
  description,
  url,
  buttonText = "문제 풀어보기",
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  // Client-only — `navigator.share` is browser API, evaluating during SSR/first render
  // would mismatch hydration. Defer to useEffect so server/first-client render agree on `false`.
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setShareUrl(url || window.location.href);
    setHasNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKakaoShare = () => {
    if (typeof window === "undefined") return;
    const Kakao = (window as any).Kakao;
    if (!Kakao?.Share) {
      // Kakao SDK not loaded — fallback to copy
      handleCopyLink();
      return;
    }

    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl: `${shareUrl.split("?")[0]}${shareUrl.includes("/opengraph-image") ? "" : "/opengraph-image"}`,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        {
          title: buttonText,
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url: shareUrl });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* KakaoTalk */}
      <button
        onClick={handleKakaoShare}
        className="flex items-center gap-1.5 rounded-lg bg-[#FEE500] px-3 py-2 text-xs font-bold text-[#3C1E1E] hover:bg-[#F5DC00] transition-colors"
        title="카카오톡으로 공유"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E">
          <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.734 1.811 5.126 4.535 6.472-.162.578-.587 2.093-.672 2.418-.105.399.146.394.307.287.126-.084 2.005-1.362 2.82-1.919.33.048.668.073 1.01.073 5.523 0 10-3.463 10-7.331C20 6.463 17.523 3 12 3z"/>
        </svg>
        카카오톡
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
          copied
            ? "border-emerald-300 bg-emerald-50 text-emerald-600"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }`}
        title="링크 복사"
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            복사 완료!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            링크 복사
          </>
        )}
      </button>

      {/* Native Share (mobile only) */}
      {hasNativeShare && (
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          title="공유하기"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          공유
        </button>
      )}
    </div>
  );
}
