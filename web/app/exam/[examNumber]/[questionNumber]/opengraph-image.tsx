import { ImageResponse } from "next/og";
import { getQuestion } from "@/lib/data";

export const runtime = "nodejs";
export const alt = "한능검 기출문제";
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
  params: Promise<{ examNumber: string; questionNumber: string }>;
}) {
  const { examNumber: en, questionNumber: qn } = await params;
  const examNumber = Number(en);
  const questionNumber = Number(qn);
  const data = getQuestion(examNumber, questionNumber);

  const era = data?.question.era || "고려";
  const category = data?.question.category || "정치";
  const points = data?.question.points || 2;
  const keywords = data?.question.keywords?.slice(0, 3) || [];
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
          position: "relative",
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "16px",
                fontWeight: 600,
                color: "white",
              }}
            >
              {era}
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "16px",
                fontWeight: 600,
                color: "white",
              }}
            >
              {category}
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "16px",
                fontWeight: 600,
                color: "white",
              }}
            >
              {points}점
            </div>
          </div>
        </div>

        {/* Center — main info */}
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
              fontSize: "28px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              marginBottom: "8px",
            }}
          >
            제{examNumber}회 한국사능력검정시험
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "white",
              marginBottom: "16px",
            }}
          >
            {questionNumber}번 문제
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            정답과 해설 · 영상강의 보기
          </div>
        </div>

        {/* Bottom — keywords */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            {keywords.map((kw) => (
              <div
                key={kw}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 600,
                }}
              >
                #{kw}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.6)" }}>
            gcnote.co.kr
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
