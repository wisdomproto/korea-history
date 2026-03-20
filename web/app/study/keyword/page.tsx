import { Metadata } from "next";
import { getAllKeywords } from "@/lib/data";
import BreadCrumb from "@/components/BreadCrumb";
import KeywordList from "./KeywordList";

export const metadata: Metadata = {
  title: "한능검 키워드별 기출문제 - 3,800개 핵심 키워드",
  description:
    "한능검 핵심 키워드를 선택해 관련 기출문제를 모아 풀어보세요. 3,800개+ 키워드별 문제 풀기.",
};

export default function KeywordStudyPage() {
  const keywords = getAllKeywords();

  const keywordsData = keywords.map((k) => ({
    keyword: k.keyword,
    era: k.era,
    count: k.questionIds.length,
    questionIds: k.questionIds,
  }));

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "학습하기", href: "/study" },
          { label: "키워드별 풀기" },
        ]}
      />

      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">키워드별 풀기</h1>
      <p className="text-slate-500 text-[13px] mb-4">
        키워드를 선택하여 관련 문제를 풀어보세요 ({keywords.length.toLocaleString()}개)
      </p>

      <KeywordList keywords={keywordsData} />
    </div>
  );
}
