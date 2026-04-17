import Link from "next/link";
import { Metadata } from "next";
import { getAllExams } from "@/lib/data";
import BreadCrumb from "@/components/BreadCrumb";

export const metadata: Metadata = {
  title: "한능검 기출문제 전체 회차 (40~77회)",
  description:
    "한능검 기출문제 전체 회차 목록. 40~77회 최신순, 정답 해설 포함, 무료 풀기.",
  alternates: { canonical: "/exam" },
};

export default function ExamListPage() {
  const exams = getAllExams();

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "학습하기", href: "/study" },
          { label: "회차별" },
        ]}
      />

      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">회차별 기출문제</h1>
      <p className="text-slate-500 text-[13px] mb-5">
        {exams.length}개 회차 &middot; 최신순
      </p>

      {/* Intro (SEO / unique content) */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 card-shadow text-[13px] leading-[1.75] text-slate-600 space-y-2.5">
        <p>
          한국사능력검정시험(한능검)은 <strong>국사편찬위원회</strong>가 주관하는 공인 자격시험으로, 매년 약 6회(홀수·짝수월)
          전국 단위로 시행됩니다. 시험은 <strong>심화 과정(1·2·3급)</strong>과 <strong>기본 과정(4·5·6급)</strong>으로 나뉘며,
          심화는 50문항 80분·총 100점 만점에 80점 이상 1급, 70점 이상 2급, 60점 이상 3급으로 판정됩니다. 기본은 50문항 70분
          기준입니다.
        </p>
        <p>
          아래에는 제40회(2018년)부터 최신 제77회(2026년)까지 총 {exams.length}개 회차의 기출문제가 순서대로 정리되어 있습니다.
          각 회차를 선택하면 50문항을 1번부터 풀 수 있고, 모든 문항에는 정답 해설·영상 해설·시대 배경·관련 기출 링크가
          포함되어 있어 단순 풀이가 아닌 <strong>개념 연결형 학습</strong>이 가능합니다. 최근 회차부터 풀어보면서 출제 경향을
          파악한 뒤, 자주 틀리는 시대나 유형은{" "}
          <Link href="/study/custom" className="text-indigo-600 font-semibold hover:underline">맞춤형 학습</Link>으로 집중 보강하는
          흐름을 권장합니다.
        </p>
      </section>

      <div className="space-y-2">
        {exams.map(({ exam }) => (
          <Link
            key={exam.id}
            href={`/exam/${exam.examNumber}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <span className="font-bold text-[15px] text-slate-900">
                제{exam.examNumber}회
              </span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {exam.examType === "advanced" ? "심화" : "기본"}
              </span>
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
