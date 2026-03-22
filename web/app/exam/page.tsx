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
