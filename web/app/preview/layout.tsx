import type { Metadata } from "next";

// 내부 미리보기 — 검색엔진 색인 금지 (실서비스 아님)
export const metadata: Metadata = {
  title: "내부 미리보기 — 멤버십 모델",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          background: "var(--gc-ink)",
          color: "var(--gc-paper)",
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 20,
          fontSize: 13,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            background: "var(--gc-amber)",
            padding: "2px 9px",
            borderRadius: 999,
            fontSize: 11,
            letterSpacing: ".02em",
          }}
        >
          내부 미리보기
        </span>
        <span style={{ opacity: 0.85 }}>
          팀 리뷰용 데모 — 실서비스 아님 · 결제/로그인은 mock
        </span>
        <a
          href="/preview"
          style={{
            marginLeft: "auto",
            color: "var(--gc-amber-soft)",
            textDecoration: "underline",
            fontSize: 12,
          }}
        >
          ← 미리보기 홈
        </a>
      </div>
      {children}
    </div>
  );
}
