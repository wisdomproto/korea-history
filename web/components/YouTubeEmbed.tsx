"use client";

import { useEffect, useRef } from "react";

type Context = Record<string, string | number | undefined>;

interface Props {
  videoId: string;
  startSeconds?: number;
  title?: string;
  className?: string;
  context?: Context;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function YouTubeEmbed({
  videoId,
  startSeconds,
  title,
  className,
  context,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const firedRef = useRef({ play: false, complete: false });

  useEffect(() => {
    firedRef.current = { play: false, complete: false };

    const iframe = iframeRef.current;
    if (!iframe) return;

    function sendListening() {
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: videoId }),
        "*"
      );
    }

    function onLoad() {
      sendListening();
      setTimeout(sendListening, 1000);
    }

    iframe.addEventListener("load", onLoad);

    function onMessage(e: MessageEvent) {
      if (typeof e.origin !== "string" || !e.origin.includes("youtube.com")) return;
      let data: { event?: string; info?: number } | undefined;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!data || data.event !== "onStateChange") return;

      const baseParams = {
        video_id: videoId,
        video_title: title,
        ...context,
      };

      if (data.info === 1 && !firedRef.current.play) {
        firedRef.current.play = true;
        window.gtag?.("event", "video_play", baseParams);
      } else if (data.info === 0 && !firedRef.current.complete) {
        firedRef.current.complete = true;
        window.gtag?.("event", "video_complete", baseParams);
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("message", onMessage);
    };
  }, [videoId, title, context]);

  const params = new URLSearchParams({
    rel: "0",
    enablejsapi: "1",
    ...(startSeconds ? { start: String(startSeconds) } : {}),
  });

  return (
    <iframe
      ref={iframeRef}
      className={className}
      src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
      title={title || "영상"}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
