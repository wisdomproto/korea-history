import Link from "next/link";
import Image from "next/image";
import { getAllExams, getQuestionsByEra, getAllKeywords } from "@/lib/data";
import { getNotesGroupedBySection } from "@/lib/notes";

const ERA_COLORS: Record<string, string> = {
  "선사·고조선": "from-stone-400 to-stone-500",
  삼국: "from-violet-400 to-violet-500",
  남북국: "from-blue-400 to-blue-500",
  고려: "from-cyan-400 to-cyan-500",
  "조선 전기": "from-emerald-400 to-emerald-500",
  "조선 후기": "from-teal-400 to-teal-500",
  근대: "from-amber-400 to-amber-500",
  현대: "from-red-400 to-red-500",
};

const SECTION_ERA: Record<string, { label: string; color: string; dot: string }> = {
  s1: { label: "고대·삼국", color: "text-violet-600", dot: "bg-violet-500" },
  s2: { label: "고려", color: "text-blue-600", dot: "bg-blue-500" },
  s3: { label: "조선 전기", color: "text-cyan-600", dot: "bg-cyan-500" },
  s4: { label: "조선 후기", color: "text-emerald-600", dot: "bg-emerald-500" },
  s5: { label: "근대", color: "text-amber-600", dot: "bg-amber-500" },
  s6: { label: "일제 강점기", color: "text-orange-600", dot: "bg-orange-500" },
  s7: { label: "현대", color: "text-red-600", dot: "bg-red-500" },
};

export default function HomePage() {
  const exams = getAllExams();
  const eraData = getQuestionsByEra();
  const keywords = getAllKeywords();
  const totalQuestions = exams.reduce((sum, e) => sum + e.questions.length, 0);
  const notesGrouped = getNotesGroupedBySection();
  const latestExams = exams.slice(0, 4);
  const topKeywords = keywords.slice(0, 24);
  const totalNotes = Object.values(notesGrouped).flat().length;

  const maxEraCount = Math.max(...eraData.map((e) => e.count));

  return (
    <div className="space-y-8">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 px-6 py-10 text-center text-white shadow-lg">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm overflow-hidden">
            <Image
              src="/logo.png"
              alt="기출노트 한능검"
              width={56}
              height={56}
              className="rounded-xl"
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            기출노트 한능검
          </h1>
          <p className="mt-1.5 text-indigo-100 text-sm sm:text-base">
            한국사능력검정시험 기출문제 · 해설 · 요약노트
          </p>
          <p className="mt-1 text-indigo-200/70 text-xs">
            {exams.length}개 회차 · {totalQuestions.toLocaleString()}문항 · {totalNotes}개 요약노트
          </p>

          <div className="mt-6 flex justify-center gap-2.5 flex-wrap">
            <Link
              href="/study"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 shadow-lg shadow-indigo-900/20 hover:bg-indigo-50 transition-colors"
            >
              학습 시작하기
            </Link>
            <Link
              href="/notes"
              className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-colors"
            >
              요약노트
            </Link>
            <Link
              href="/wrong-answers"
              className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-colors"
            >
              오답노트
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Quick Stats ─── */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { value: exams.length, label: "회차", icon: "📋" },
          { value: totalQuestions.toLocaleString(), label: "문항", icon: "✏️" },
          { value: totalNotes, label: "요약노트", icon: "📖" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card !rounded-2xl px-3 py-4 text-center"
          >
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="text-lg font-extrabold text-slate-900">
              {stat.value}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* ─── Latest Exams ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-900">
            최신 기출문제
          </h2>
          <Link
            href="/exam"
            className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            전체보기 →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {latestExams.map(({ exam }) => (
            <Link
              key={exam.id}
              href={`/exam/${exam.examNumber}`}
              className="card card-interactive !rounded-2xl p-4"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xs font-bold shadow-sm">
                  {exam.examNumber}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    제{exam.examNumber}회
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {exam.examDate}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {exam.totalQuestions}문제
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600">
                  풀기 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Era Distribution ─── */}
      <section>
        <h2 className="text-base font-extrabold text-slate-900 mb-3">
          시대별 출제 현황
        </h2>
        <div className="card !rounded-2xl p-4 space-y-2.5">
          {eraData.map(({ era, count }) => (
            <div key={era} className="flex items-center gap-3">
              <span className="w-16 text-xs font-semibold text-slate-600 shrink-0 text-right">
                {era.replace("·", "/")}
              </span>
              <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${ERA_COLORS[era] || "from-slate-400 to-slate-500"}`}
                  style={{
                    width: `${Math.max((count / maxEraCount) * 100, 4)}%`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500 w-8 text-right shrink-0">
                {count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Notes by Era (horizontal scroll per section) ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-900">
            요약노트
          </h2>
          <Link
            href="/notes"
            className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            전체보기 →
          </Link>
        </div>

        <div className="space-y-4">
          {["s1", "s2", "s3", "s4", "s5", "s6", "s7"].map((sectionId) => {
            const notes = notesGrouped[sectionId];
            if (!notes || notes.length === 0) return null;
            const meta = SECTION_ERA[sectionId];

            return (
              <div key={sectionId}>
                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${meta.dot}`}
                  />
                  <span
                    className={`text-xs font-bold ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {notes.length}개
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {notes.slice(0, 6).map((note) => (
                    <Link
                      key={note.id}
                      href={`/notes/${note.id}`}
                      className="card card-interactive !rounded-xl px-3 py-2.5 shrink-0 min-w-[140px] max-w-[180px]"
                    >
                      <div className="text-xs font-semibold text-slate-700 line-clamp-2 leading-relaxed">
                        {note.title}
                      </div>
                      {note.questionCount > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          기출 {note.questionCount}문제
                        </div>
                      )}
                    </Link>
                  ))}
                  {notes.length > 6 && (
                    <Link
                      href="/notes"
                      className="flex items-center justify-center shrink-0 w-[80px] rounded-xl border-2 border-dashed border-indigo-200 text-xs font-semibold text-indigo-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                    >
                      +{notes.length - 6}개
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Popular Keywords ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-900">
            자주 출제되는 키워드
          </h2>
          <Link
            href="/study/keyword"
            className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            전체보기 →
          </Link>
        </div>

        <div className="card !rounded-2xl p-4">
          <div className="flex flex-wrap gap-2">
            {topKeywords.map(({ keyword, questionIds }) => (
              <Link
                key={keyword}
                href={`/study/keyword?q=${encodeURIComponent(keyword)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              >
                <span>{keyword}</span>
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                  {questionIds.length}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── All Exams Grid ─── */}
      <section>
        <h2 className="text-base font-extrabold text-slate-900 mb-3">
          전체 기출문제
        </h2>
        <div className="card !rounded-2xl p-4">
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
            {exams.map(({ exam }) => (
              <Link
                key={exam.id}
                href={`/exam/${exam.examNumber}`}
                className="flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                {exam.examNumber}회
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
