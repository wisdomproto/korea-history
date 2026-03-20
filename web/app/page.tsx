import Link from "next/link";
import { getAllExams, getAllKeywords } from "@/lib/data";
import BannerCarousel from "@/components/BannerCarousel";
import AdSlot from "@/components/AdSlot";

const QUICK_ACTIONS = [
  {
    href: "/study",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
      </svg>
    ),
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: "기출문제 풀기",
    desc: "40~77회 전체 기출문제를\n회차별로 풀어보세요",
  },
  {
    href: "/study",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    title: "맞춤형 학습",
    desc: "시대 × 유형을 선택해서\n나만의 학습 세트를 만드세요",
  },
  {
    href: "/study/keyword",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
      </svg>
    ),
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
    title: "키워드 학습",
    desc: "3,800개 키워드로\n핵심 개념을 정리하세요",
  },
  {
    href: "/wrong-answers",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "bg-red-50",
    iconColor: "text-red-400",
    title: "오답 복습",
    desc: "틀린 문제만 모아서\n집중 복습하세요",
  },
];

export default function HomePage() {
  const exams = getAllExams();
  const keywords = getAllKeywords();
  const latestExams = exams.slice(0, 5);
  const topKeywords = keywords.slice(0, 16);

  return (
    <div className="space-y-8">
      {/* ─── Banner ─── */}
      <BannerCarousel />

      {/* ─── Quick Actions ─── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 학습</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ href, icon, iconBg, iconColor, title, desc }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-2xl bg-white border border-gray-200/80 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-3`}>
                {icon}
              </div>
              <p className="text-[15px] font-bold text-gray-900 mb-1.5">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Ad: between quick actions and exams */}
      <AdSlot size="leaderboard" slot={process.env.NEXT_PUBLIC_AD_SLOT_HOME} className="my-2" />

      {/* ─── Latest Exams ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">최신 기출문제</h2>
          <Link href="/exam" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            전체보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {latestExams.map(({ exam }) => {
            const isAdvanced = exam.examType === "advanced";
            return (
              <Link
                key={exam.id}
                href={`/exam/${exam.examNumber}`}
                className="group rounded-2xl bg-white border border-gray-200/80 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span
                  className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-2.5 ${
                    isAdvanced
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {isAdvanced ? "심화" : "기본"}
                </span>
                <p className="text-lg font-bold text-gray-900 mb-1">제{exam.examNumber}회</p>
                <p className="text-xs text-gray-400 mb-3">{exam.totalQuestions}문항 · 70분</p>
                <div
                  className={`w-full py-2 rounded-lg text-center text-[13px] font-semibold ${
                    isAdvanced
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  풀기 시작
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Popular Keywords ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">인기 키워드</h2>
          <Link href="/study/keyword" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            전체보기 →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {topKeywords.map(({ keyword, questionIds }) => (
            <Link
              key={keyword}
              href="/study/keyword"
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200/80 px-3.5 py-2 text-xs font-medium text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
            >
              {keyword}
              <span className="text-[10px] text-gray-400">{questionIds.length}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
