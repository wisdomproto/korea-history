import Link from "next/link";
import { Metadata } from "next";
import { getQuestionsByEra, getQuestionsByCategory } from "@/lib/data";
import BreadCrumb from "@/components/BreadCrumb";
import CustomTabs from "./CustomTabs";

export const metadata: Metadata = {
  title: "맞춤형 학습 - 한국사능력검정시험",
  description:
    "시대별, 유형별로 한국사 기출문제를 선택하여 집중 학습하세요.",
};

const ERA_COLORS: Record<string, string> = {
  "선사·고조선": "bg-amber-50 border-amber-200",
  삼국: "bg-blue-50 border-blue-200",
  남북국: "bg-cyan-50 border-cyan-200",
  고려: "bg-emerald-50 border-emerald-200",
  "조선 전기": "bg-indigo-50 border-indigo-200",
  "조선 후기": "bg-violet-50 border-violet-200",
  근대: "bg-rose-50 border-rose-200",
  현대: "bg-orange-50 border-orange-200",
};

const CATEGORY_COLORS: Record<string, string> = {
  정치: "bg-red-50 border-red-200",
  경제: "bg-green-50 border-green-200",
  사회: "bg-blue-50 border-blue-200",
  문화: "bg-purple-50 border-purple-200",
};

export default function CustomStudyPage() {
  const eraData = getQuestionsByEra();
  const categoryData = getQuestionsByCategory();

  const eraItems = eraData.map(({ era, count, questions }) => ({
    label: era,
    count,
    color: ERA_COLORS[era] || "bg-gray-50 border-gray-200",
    questions: questions.slice(0, 8),
    totalCount: count,
  }));

  const categoryItems = categoryData.map(({ category, count, questions }) => ({
    label: category,
    count,
    color: CATEGORY_COLORS[category] || "bg-gray-50 border-gray-200",
    questions: questions.slice(0, 8),
    totalCount: count,
  }));

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

      <CustomTabs eraItems={eraItems} categoryItems={categoryItems} />
    </div>
  );
}
