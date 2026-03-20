import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "기출노트 한능검 — 한능검 기출문제 무료 풀기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
            }}
          >
            📚
          </div>
          <span style={{ fontSize: "36px", fontWeight: 700, color: "white" }}>
            기출노트 한능검
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.3,
            marginBottom: "24px",
          }}
        >
          한능검 기출문제 무료 풀기
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginBottom: "32px",
          }}
        >
          {[
            { num: "1,900+", label: "기출문제" },
            { num: "87개", label: "요약노트" },
            { num: "3,872", label: "키워드" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "16px",
                padding: "16px 32px",
              }}
            >
              <span style={{ fontSize: "32px", fontWeight: 800, color: "white" }}>
                {s.num}
              </span>
              <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.85)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)" }}>
          gcnote.co.kr
        </div>
      </div>
    ),
    { ...size }
  );
}
