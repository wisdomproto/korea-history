import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Dynamic OG — 1,900개 prerender 제거. SNS 첫 공유 시 generate → Vercel CDN cache.
// Phase 2 (2026-05-05): 빌드 시간 대폭 단축. 첫 공유자 0.5~1초 지연, 이후 즉시.
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}
export const alt = "한능검 기출문제";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ examNumber: string; questionNumber: string }> }) {
  const { examNumber, questionNumber } = await params;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #059669 0%, #10B981 100%)", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: "12px" }}>기출노트 한능검</div>
      <div style={{ fontSize: "28px", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>{`제${examNumber}회 한국사능력검정시험`}</div>
      <div style={{ fontSize: "72px", fontWeight: 800, color: "white", marginBottom: "16px" }}>{`${questionNumber}번 문제`}</div>
      <div style={{ fontSize: "28px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>정답과 해설 보기</div>
      <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", marginTop: "24px" }}>gcnote.co.kr</div>
    </div>,
    { ...size },
  );
}
