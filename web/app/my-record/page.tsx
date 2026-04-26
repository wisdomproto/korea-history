import { Metadata } from "next";
import MyRecord from "./MyRecord";

export const metadata: Metadata = {
  title: "내 학습 기록 - 한능검 점수·급수·약점 분석",
  description: "한능검 풀이 기록, 회차별 점수, 급수 판정, 시대별·유형별 약점 분석.",
  alternates: { canonical: "/my-record" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <MyRecord />;
}
