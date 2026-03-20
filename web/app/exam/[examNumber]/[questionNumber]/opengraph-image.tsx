import { ImageResponse } from "next/og";
import { getAllQuestionParams } from "@/lib/data";

export const runtime = "nodejs";
export function generateStaticParams() {
  return getAllQuestionParams().map((p) => ({ examNumber: String(p.examNumber), questionNumber: String(p.questionNumber) }));
}
export const alt = "한능검 기출문제";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image(props: any) {
  const examNumber = props.params?.examNumber || "?";
  const questionNumber = props.params?.questionNumber || "?";
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
