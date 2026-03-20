import { Metadata } from "next";
import MyRecord from "./MyRecord";

export const metadata: Metadata = {
  title: "내 기록 - 기출노트 한능검",
  description: "한국사능력검정시험 풀이 기록, 점수, 급수, 약점 분석",
};

export default function Page() {
  return <MyRecord />;
}
