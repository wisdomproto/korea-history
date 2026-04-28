import { Metadata } from "next";
import { getEraCategoryCounts } from "@/lib/data";
import BreadCrumb from "@/components/BreadCrumb";
import CustomSelector from "./CustomSelector";

export const metadata: Metadata = {
  title: "한능검 시대별 맞춤 학습 — 약점 시대만 골라 풀기",
  description:
    "기출노트의 한능검 시대별 유형별 맞춤 학습. 8개 시대 × 4개 유형(정치·경제·사회·문화) 매트릭스에서 약점 칸만 체크해 1,900+ 기출문제 중 원하는 세트로 무료 학습. 한국사 시대별 정리 한 번에.",
  keywords: [
    "한능검 시대별 정리", "한능검 맞춤 학습", "한능검 시대별",
    "한국사 시대별 정리", "한능검 약점 학습", "한능검 무료",
    "기출노트 한능검", "한국사능력검정시험 시대별",
  ],
  alternates: { canonical: "/study/custom" },
  openGraph: {
    title: "한능검 시대별 맞춤 학습 — 약점만 골라 풀기",
    description: "8개 시대 × 4개 유형 매트릭스에서 약점만 체크해 무료 학습.",
    url: "/study/custom",
    type: "website",
    siteName: "기출노트 한능검",
  },
};

export default function CustomStudyPage() {
  const data = getEraCategoryCounts();

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "학습하기", href: "/study" },
          { label: "맞춤형" },
        ]}
      />

      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">맞춤형 학습</h1>
      <p className="text-slate-500 text-[13px] mb-4">
        시대와 유형을 선택하여 집중 학습하세요
      </p>

      <CustomSelector
        eras={data.eras}
        categories={data.categories}
        counts={data.counts}
        questionIds={data.questionIds}
        totalByEra={data.totalByEra}
        totalByCategory={data.totalByCategory}
      />
    </div>
  );
}
