import Link from "next/link";
import { getAllExams, getQuestionsByEra, getAllKeywords } from "@/lib/data";
import BannerCarousel from "@/components/BannerCarousel";

export default function HomePage() {
  const exams = getAllExams();
  const keywords = getAllKeywords();
  const totalQuestions = exams.reduce((sum, e) => sum + e.questions.length, 0);
  const latestExams = exams.slice(0, 4);
  const topKeywords = keywords.slice(0, 16);

  return (
    <div className="space-y-6">
      {/* ─── Banner ─── */}
      <BannerCarousel />

      {/* ─── Main Nav ─── */}
      <section className="grid grid-cols-4 gap-2">
        <Link href="/study" className="rounded-2xl bg-white/90 p-3 text-center hover:shadow-md hover:-translate-y-0.5 transition-all" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-1">📚</span>
          <p className="text-xs font-black text-slate-700">학습하기</p>
        </Link>
        <Link href="/wrong-answers" className="rounded-2xl bg-white/90 p-3 text-center hover:shadow-md hover:-translate-y-0.5 transition-all" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-1">🔄</span>
          <p className="text-xs font-black text-slate-700">오답복습</p>
        </Link>
        <Link href="/notes" className="rounded-2xl bg-white/90 p-3 text-center hover:shadow-md hover:-translate-y-0.5 transition-all" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-1">📝</span>
          <p className="text-xs font-black text-slate-700">요약노트</p>
        </Link>
        <Link href="/my-record" className="rounded-2xl bg-white/90 p-3 text-center hover:shadow-md hover:-translate-y-0.5 transition-all" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-1">📊</span>
          <p className="text-xs font-black text-slate-700">내 기록</p>
        </Link>
      </section>

      {/* ─── Latest Exams ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-slate-800">최신 기출</h2>
          <Link href="/exam" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
            전체보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {latestExams.map(({ exam }) => (
            <Link
              key={exam.id}
              href={`/exam/${exam.examNumber}`}
              className="rounded-2xl bg-white/90 border border-slate-200/50 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-black shadow-sm">
                  {exam.examNumber}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">제{exam.examNumber}회</p>
                  <p className="text-[11px] text-slate-400">{exam.totalQuestions}문제</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Popular Keywords ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-slate-800">인기 키워드</h2>
          <Link href="/study/keyword" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
            전체보기 →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {topKeywords.map(({ keyword, questionIds }) => (
            <Link
              key={keyword}
              href={`/study/keyword`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-slate-200/60 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
            >
              {keyword}
              <span className="text-[10px] text-slate-400">{questionIds.length}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
