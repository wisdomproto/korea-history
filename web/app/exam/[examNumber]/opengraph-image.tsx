import { ImageResponse } from "next/og";
import { getExamByNumber } from "@/lib/data";

export const runtime = "nodejs";
export const alt = "한능검 기출문제";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateImageMetadata({
  params,
}: {
  params: { examNumber: string };
}) {
  return [{ id: "og", alt: `제${params.examNumber}회 한능검 기출문제`, contentType: "image/png", size }];
}

export default async function Image({
  params,
}: {
  params: { examNumber: string };
}) {
  const examNumber = Number(params.examNumber);
  const examFile = getExamByNumber(examNumber);

  const totalQuestions = examFile?.exam.totalQuestions || 50;
  const examType = examFile?.exam.examType === "basic" ? "기본" : "심화";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
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
            {examType}
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
              fontSize: "32px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              marginBottom: "8px",
            }}
          >
            한국사능력검정시험
          </div>
          <div
            style={{
              fontSize: "80px",
              fontWeight: 800,
              color: "white",
              marginBottom: "16px",
            }}
          >
            제{examNumber}회
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "10px 24px",
                fontSize: "20px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {totalQuestions}문항
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "10px 24px",
                fontSize: "20px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              정답 · 해설 · 영상강의
            </div>
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
