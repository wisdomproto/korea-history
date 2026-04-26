import { Metadata } from "next";

export const metadata: Metadata = {
  title: "오답노트 - 한능검 자동 수집",
  description: "한능검 학습 중 자동 수집된 오답. 시대/유형별 약점 분석.",
  alternates: { canonical: "/wrong-answers" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
