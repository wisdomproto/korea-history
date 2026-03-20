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

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden rounded-3xl px-6 py-10 text-center text-white" style={{
        background: "linear-gradient(135deg, #2D3436 0%, #4A6741 50%, #2D3436 100%)",
      }}>
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative">
          <span className="text-4xl mb-3 block">👨‍🎓</span>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            기출노트 한능검
          </h1>
          <p className="mt-2 text-white/60 text-sm">
            {exams.length}개 회차 · {totalQuestions.toLocaleString()}문항 · AI 해설
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/study"
              className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-800 shadow-lg hover:scale-105 transition-transform"
            >
              학습 시작 →
            </Link>
            <Link
              href="/notes"
              className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-bold text-white border border-white/20 hover:bg-white/20 transition-colors"
            >
              요약노트
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Quick Actions ─── */}
      <section className="grid grid-cols-2 gap-3">
        <Link href="/study/custom" className="group rounded-2xl bg-white/90 border border-emerald-200/50 p-4 hover:shadow-lg hover:-translate-y-1 transition-all" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-2">🎯</span>
          <p className="text-sm font-black text-slate-800">맞춤형 학습</p>
          <p className="text-[11px] text-slate-400 mt-0.5">시대 × 유형 선택</p>
        </Link>
        <Link href="/study/keyword" className="group rounded-2xl bg-white/90 border border-amber-200/50 p-4 hover:shadow-lg hover:-translate-y-1 transition-all" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-2">🔑</span>
          <p className="text-sm font-black text-slate-800">키워드 학습</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{keywords.length.toLocaleString()}개 키워드</p>
        </Link>
        <Link href="/wrong-answers" className="group rounded-2xl bg-white/90 border border-red-200/50 p-4 hover:shadow-lg hover:-translate-y-1 transition-all" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-2">📝</span>
          <p className="text-sm font-black text-slate-800">오답 복습</p>
          <p className="text-[11px] text-slate-400 mt-0.5">틀린 문제 다시 풀기</p>
        </Link>
        <Link href="/board" className="group rounded-2xl bg-white/90 border border-violet-200/50 p-4 hover:shadow-lg hover:-translate-y-1 transition-all" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl block mb-2">💬</span>
          <p className="text-sm font-black text-slate-800">게시판</p>
          <p className="text-[11px] text-slate-400 mt-0.5">질문 · 건의 · 공지</p>
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
