import Link from "next/link";
import { getAllExams } from "@/lib/data";

export default function HomePage() {
  const exams = getAllExams();
  const totalQuestions = exams.reduce(
    (sum, e) => sum + e.questions.length,
    0
  );

  return (
    <div>
      <section className="py-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          한국사능력검정시험 기출문제
        </h1>
        <p className="text-lg text-gray-600 mb-1">
          {exams.length}개 회차 &middot; {totalQuestions.toLocaleString()}문항
          무료
        </p>
        <p className="text-gray-500 mb-8">
          정답 해설과 시대별 요약노트로 효율적으로 준비하세요.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/exam"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors"
          >
            기출문제 풀기
          </Link>
          <Link
            href="/notes"
            className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            요약노트 보기
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">최신 기출문제</h2>
        <div className="grid gap-3">
          {exams.slice(0, 6).map(({ exam }) => (
            <Link
              key={exam.id}
              href={`/exam/${exam.examNumber}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
            >
              <div>
                <span className="font-semibold">제{exam.examNumber}회</span>
                <span className="ml-2 text-sm text-gray-500">
                  {exam.examDate}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {exam.totalQuestions}문제 &rarr;
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/exam"
            className="text-indigo-600 font-medium hover:underline"
          >
            전체 {exams.length}개 회차 보기 &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
