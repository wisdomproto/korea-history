import { ImageResponse } from "next/og";
import { getNoteById } from "@/lib/notes";

export const runtime = "nodejs";
export const alt = "한능검 요약노트";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ERA_COLORS: Record<string, { bg: string; accent: string }> = {
  "선사·고조선": { bg: "#F59E0B", accent: "#D97706" },
  "삼국": { bg: "#EF4444", accent: "#DC2626" },
  "남북국": { bg: "#F97316", accent: "#EA580C" },
  "고려": { bg: "#10B981", accent: "#059669" },
  "조선 전기": { bg: "#3B82F6", accent: "#2563EB" },
  "조선 후기": { bg: "#6366F1", accent: "#4F46E5" },
  "근대": { bg: "#8B5CF6", accent: "#7C3AED" },
  "현대": { bg: "#EC4899", accent: "#DB2777" },
};

export default async function Image({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  const note = getNoteById(noteId);

  const title = note?.title || "요약노트";
  const eraLabel = note?.eraLabel || "한국사";
  const questionCount = note?.relatedQuestionIds.length || 0;
  const era = note?.era || "고려";
  const colors = ERA_COLORS[era] || ERA_COLORS["고려"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%)`,
          fontFamily: "sans-serif",
          padding: "48px 60px",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "auto",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: "10px",
              padding: "6px 16px",
              fontSize: "18px",
              fontWeight: 700,
              color: "white",
            }}
          >
            📚 기출노트 한능검
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: "10px",
              padding: "6px 16px",
              fontSize: "18px",
              fontWeight: 700,
              color: "white",
            }}
          >
            📝 요약노트
          </div>
        </div>

        {/* Center */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: "12px",
              padding: "8px 24px",
              fontSize: "22px",
              fontWeight: 700,
              color: "white",
              marginBottom: "20px",
            }}
          >
            {eraLabel}
          </div>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "white",
              textAlign: "center",
              lineHeight: 1.3,
              marginBottom: "20px",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            핵심 요약 · 관련 기출 {questionCount}문제
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-end",
          }}
        >
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.6)" }}>
            gcnote.co.kr
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
