import { ImageResponse } from "next/og";
import { getAllNoteIds } from "@/lib/notes";

export const runtime = "nodejs";
export function generateStaticParams() {
  return getAllNoteIds().map((id) => ({ noteId: id }));
}
export const alt = "한능검 요약노트";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #059669 0%, #10B981 100%)", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: "12px" }}>기출노트 한능검</div>
      <div style={{ fontSize: "56px", fontWeight: 800, color: "white", marginBottom: "16px" }}>한능검 요약노트</div>
      <div style={{ fontSize: "24px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>핵심 요약 · 관련 기출문제</div>
      <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", marginTop: "24px" }}>gcnote.co.kr</div>
    </div>,
    { ...size },
  );
}
