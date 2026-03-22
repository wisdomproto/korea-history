import Link from "next/link";
import { Metadata } from "next";
import { getAllExams, getAllKeywords } from "@/lib/data";

export const metadata: Metadata = {
  title: "한능검 기출문제 학습 - 회차별·시대별·키워드별",
  description:
    "한능검 기출문제를 회차별, 시대별, 키워드별로 학습하세요. 맞춤형 학습과 오답 복습으로 1급 합격!",
  alternates: { canonical: "/study" },
};

export default function StudyPage() {
  const exams = getAllExams();
  const keywords = getAllKeywords();
  const totalQuestions = exams.reduce(
    (sum, e) => sum + e.questions.length,
    0
  );

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">학습하기</h1>
      <p className="text-slate-500 text-[13px] mb-5">
        {exams.length}개 회차 &middot; {totalQuestions.toLocaleString()}문항
      </p>

      {/* 문제풀이 */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-slate-800 mb-2.5 px-0.5">문제풀이</h2>
        <div className="space-y-2">
          <StudyCard
            href="/exam"
            bgColor="bg-indigo-500"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="회차별"
            description="시험 회차를 선택하여 기출문제를 풀어보세요"
          />
          <StudyCard
            href="/study/custom"
            bgColor="bg-violet-500"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            }
            title="맞춤형"
            description="시대와 유형을 직접 선택하여 학습하세요"
          />
          <StudyCard
            href="/study/keyword"
            bgColor="bg-pink-500"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            title="키워드별"
            description={`핵심 키워드로 관련 문제를 모아 풀어보세요 · ${keywords.length.toLocaleString()}개`}
          />
        </div>
      </section>

      {/* 학습 도구 */}
      <section>
        <h2 className="text-sm font-bold text-slate-800 mb-2.5 px-0.5">학습 도구</h2>
        <div className="space-y-2">
          <StudyCard
            href="/wrong-answers"
            bgColor="bg-amber-500"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            title="오답 복습"
            description="틀린 문제를 다시 풀어보세요"
          />
        </div>
      </section>
    </div>
  );
}

function StudyCard({
  href,
  bgColor,
  icon,
  title,
  description,
}: {
  href: string;
  bgColor: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 card-shadow hover:card-shadow-md hover:border-indigo-200 transition-all"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgColor}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[15px] text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <svg className="h-5 w-5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
