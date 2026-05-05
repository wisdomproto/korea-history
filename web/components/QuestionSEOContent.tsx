import Link from "next/link";
import type { Exam, Question } from "@/lib/types";
import { getEraContext, getCategoryContext } from "@/lib/era-context";

interface RelatedQuestion {
  examNumber: number;
  questionNumber: number;
  content: string;
}

interface Props {
  exam: Exam;
  question: Question;
  related: RelatedQuestion[];
  /** Render only inner content (no section/details/summary wrapper). Use when embedding inside an external container. */
  bare?: boolean;
}

/**
 * Server-rendered long-form study material for the question page.
 * Inlined into initial HTML so search crawlers index the substantive
 * content (answer, explanation, era background, related questions)
 * even though the interactive QuestionCard is client-rendered.
 *
 * Default mode wraps in <details> so users don't see spoilers.
 * Pass bare={true} to render only inner content (parent provides wrapping).
 */
export default function QuestionSEOContent({ exam, question, related, bare }: Props) {
  const era = getEraContext(question.era);
  const category = getCategoryContext(question.category);
  const correctText = question.choices[question.correctAnswer - 1];
  const difficultyLabel =
    question.difficulty === 1 ? "쉬움" : question.difficulty === 2 ? "보통" : "어려움";

  const inner = (
    <div className="space-y-6 text-[14px] leading-[1.75] text-slate-700">
          <div>
            <h2 className="text-sm font-black text-slate-900 mb-2">
              제{exam.examNumber}회 한능검 {question.questionNumber}번 문제 개요
            </h2>
            <p>
              이 문제는 한국사능력검정시험 제{exam.examNumber}회{" "}
              {exam.examType === "advanced" ? "심화" : "기본"} 과정 {question.questionNumber}번
              문항으로, <strong>{era.label}</strong>의 <strong>{category.label}</strong> 영역에서
              출제되었다. 배점은 {question.points}점, 난이도는 {difficultyLabel} 수준이다.
              {question.keywords && question.keywords.length > 0 && (
                <> 핵심 키워드는 <strong>{question.keywords.join(", ")}</strong>이다.</>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-black text-slate-900 mb-2">정답과 해설</h2>
            <p className="mb-2">
              정답은 <strong className="text-emerald-700">{question.correctAnswer}번</strong>
              {correctText ? (
                <> — &ldquo;{correctText}&rdquo;이다.</>
              ) : (
                <> 이다.</>
              )}
            </p>
            {question.explanation ? (
              <p className="whitespace-pre-line text-slate-700">{question.explanation}</p>
            ) : (
              <p className="text-slate-600">
                이 문항은 {era.label}의 주요 사건과 제도를 단서로 선지를 판별하는 유형이다.{" "}
                {category.focus}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-sm font-black text-slate-900 mb-2">
              시대 배경 — {era.label}
              {era.period && <span className="text-slate-500 font-normal"> ({era.period})</span>}
            </h2>
            <p className="mb-3">{era.summary}</p>
            <ul className="list-disc pl-5 space-y-1 text-[13px] text-slate-600">
              {era.keyPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-black text-slate-900 mb-2">
              {category.label} 영역 학습 포인트
            </h2>
            <p>{category.focus}</p>
          </div>

      {related.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-slate-900 mb-2">
            {era.label} 관련 기출문제 더 풀어보기
          </h2>
          <ul className="space-y-1.5">
            {related.map((r) => (
              <li key={`${r.examNumber}-${r.questionNumber}`}>
                <Link
                  href={`/exam/${r.examNumber}/${r.questionNumber}`}
                  className="text-[13px] text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  제{r.examNumber}회 {r.questionNumber}번 — {r.content.slice(0, 48)}
                  {r.content.length > 48 && "…"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (bare) return inner;

  return (
    <section className="mt-8 space-y-3" aria-label="문제 학습 자료">
      <details className="group rounded-2xl border border-slate-200 bg-white card-shadow overflow-hidden">
        <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-3 select-none list-none">
          <span className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <span className="text-[15px] font-bold text-slate-800">
              학습 자료 펼쳐보기 — 정답·해설·시대 배경
            </span>
          </span>
          <svg
            className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="border-t border-slate-100 px-5 py-5">{inner}</div>
      </details>
    </section>
  );
}
