import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "한능검 요약노트";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
          fontFamily: "sans-serif",
          padding: "48px 60px",
        }}
      >
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
            기출노트 한능검
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
            요약노트
          </div>
        </div>

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
              fontSize: "56px",
              fontWeight: 800,
              color: "white",
              textAlign: "center",
              lineHeight: 1.3,
              marginBottom: "20px",
            }}
          >
            한능검 요약노트
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            핵심 요약 · 관련 기출문제
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.6)" }}>
            gcnote.co.kr
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
