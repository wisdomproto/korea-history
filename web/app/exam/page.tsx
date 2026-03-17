import Link from "next/link";
import { Metadata } from "next";
import { getAllExams } from "@/lib/data";

export const metadata: Metadata = {
  title: "한국사능력검정시험 기출문제 전체 회차",
  description:
    "한국사능력검정시험 전체 기출문제 회차 목록. 최신순 정렬, 무료 풀기.",
};

export default function ExamListPage() {
  const exams = getAllExams();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">기출문제</h1>
      <div className="grid gap-3">
        {exams.map(({ exam }) => (
          <Link
            key={exam.id}
            href={`/exam/${exam.examNumber}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
          >
            <div>
              <span className="font-semibold text-lg">
                제{exam.examNumber}회
              </span>
              <span className="ml-3 text-sm text-gray-500">
                {exam.examDate}
              </span>
              <span className="ml-3 text-xs text-gray-400">
                {exam.examType === "advanced" ? "심화" : "기본"}
              </span>
            </div>
            <span className="text-sm text-gray-400">
              {exam.totalQuestions}문제 &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
