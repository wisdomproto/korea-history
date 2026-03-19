import { Metadata } from "next";
import { getEraCategoryCounts } from "@/lib/data";
import BreadCrumb from "@/components/BreadCrumb";
import CustomSelector from "./CustomSelector";

export const metadata: Metadata = {
  title: "맞춤형 학습 - 한국사능력검정시험",
  description: "시대별, 유형별로 한국사 기출문제를 선택하여 집중 학습하세요.",
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
