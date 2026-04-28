import Link from "next/link";
import { Metadata } from "next";
import { getAllExams, getAllKeywords } from "@/lib/data";

export const metadata: Metadata = {
  title: "한능검 무료 기출문제 풀이 — 1,900문항 회차별·시대별·키워드별",
  description:
    "기출노트의 한능검 무료 학습. 제40~77회 1,900+ 문항을 회차별·시대별·키워드별로 풀이. AI 해설 + 영상강의 + 오답노트 자동 수집. 한능검 1급·2급·3급 모두 평생 무료.",
  keywords: [
    "한능검 기출문제", "한능검 무료", "한국사능력검정시험 기출",
    "한능검 학습", "한능검 회차별", "한능검 시대별",
    "기출노트", "기출노트 한능검", "한국사 기출",
  ],
  alternates: { canonical: "/study" },
  openGraph: {
    title: "한능검 무료 기출문제 풀이 — 1,900문항",
    description: "기출노트가 제공하는 한능검 무료 학습. 회차별·시대별·키워드별 풀이 + AI 해설 + 영상강의.",
    url: "/study",
    type: "website",
    siteName: "기출노트 한능검",
  },
};

const STUDY_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "한능검 기출문제는 무료인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "네, 기출노트의 한능검 기출문제 1,900+ 문항은 평생 무료입니다. 별도 가입 없이 바로 풀 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      name: "한능검 회차는 몇 회까지 있나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "제40회부터 제77회까지 38개 회차의 한능검 심화 기출문제가 모두 등록되어 있습니다.",
      },
    },
    {
      "@type": "Question",
      name: "한능검 1급 합격 점수는?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "한국사능력검정시험 심화 기준 80점 이상이 1급, 70~79점이 2급, 60~69점이 3급입니다.",
      },
    },
    {
      "@type": "Question",
      name: "맞춤형 학습은 어떻게 작동하나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "선사시대부터 현대까지 8개 시대 × 4개 유형(정치·경제·사회·문화) 매트릭스에서 원하는 칸만 체크해 나만의 학습 세트를 만들 수 있습니다. 오답이 많은 구간만 집중 훈련할 때 효과적입니다.",
      },
    },
  ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STUDY_FAQ_SCHEMA) }}
      />
      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">한능검 기출문제 학습</h1>
      <p className="text-slate-500 text-[13px] mb-5">
        {exams.length}개 회차 &middot; {totalQuestions.toLocaleString()}문항 무료
      </p>

      {/* Intro (SEO / unique content) */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 card-shadow text-[13px] leading-[1.75] text-slate-600 space-y-2.5">
        <p>
          한능검 대비는 기출 반복이 가장 확실한 전략입니다. 기출노트는 {totalQuestions.toLocaleString()}개 기출 문항을
          <strong> 세 가지 방식</strong>으로 풀 수 있도록 구성했습니다.
        </p>
        <p>
          <strong>회차별</strong>은 실제 시험장처럼 1회분 50문항을 순서대로 풀어보는 모드로, 시간 배분과 체력 조율에
          유리합니다. <strong>맞춤형</strong>은 선사·고조선부터 현대까지 8개 시대 × 4개 유형(정치·경제·사회·문화) 매트릭스에서
          원하는 칸만 체크해 나만의 학습 세트를 만듭니다. 오답이 많은 구간만 집중적으로 훈련할 때 효과적입니다.
          <strong> 키워드별</strong>은 {keywords.length.toLocaleString()}개 핵심 키워드 중 원하는 것을 골라 관련 문제만 묶어 풀 수 있어
          &lsquo;고인돌&rsquo; &lsquo;대한매일신보&rsquo; 같은 세밀한 단서 학습에 유용합니다.
        </p>
        <p>
          풀이 도중 선택한 답은 <strong>자동으로 오답 복습 리스트</strong>에 저장되며, 회차 결과는{" "}
          <Link href="/my-record" className="text-indigo-600 font-semibold hover:underline">내 기록</Link>에서 점수·급수와
          시대/유형별 약점으로 분석됩니다. 개념 복습이 필요하면{" "}
          <Link href="/notes" className="text-indigo-600 font-semibold hover:underline">요약노트</Link> 87개 주제에서 시대별 핵심을
          정리해 두었습니다.
        </p>
      </section>

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
