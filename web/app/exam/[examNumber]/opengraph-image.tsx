import { ImageResponse } from "next/og";
import { getAllExamNumbers } from "@/lib/data";

export const runtime = "nodejs";
export function generateStaticParams() {
  return getAllExamNumbers().map((n) => ({ examNumber: String(n) }));
}
export const alt = "한능검 기출문제";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image(props: any) {
  const examNumber = props.params?.examNumber || "?";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: "12px" }}>기출노트 한능검</div>
      <div style={{ fontSize: "32px", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>한국사능력검정시험</div>
      <div style={{ fontSize: "80px", fontWeight: 800, color: "white", marginBottom: "16px" }}>{`제${examNumber}회`}</div>
      <div style={{ fontSize: "24px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>기출문제 풀기 · 정답 · 해설</div>
      <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", marginTop: "24px" }}>gcnote.co.kr</div>
    </div>,
    { ...size },
  );
}
