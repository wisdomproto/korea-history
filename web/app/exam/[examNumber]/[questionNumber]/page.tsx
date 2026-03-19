import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllQuestionParams, getQuestion } from "@/lib/data";
import { getYouTubeTimestamp } from "@/lib/youtube";
import { questionMeta, questionJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import QuestionWithTracking from "@/components/QuestionWithTracking";
import QuestionNav from "@/components/QuestionNav";

interface Props {
  params: Promise<{ examNumber: string; questionNumber: string }>;
}

export function generateStaticParams() {
  const params = getAllQuestionParams();
  return params.map((p) => ({
    examNumber: String(p.examNumber),
    questionNumber: String(p.questionNumber),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { examNumber, questionNumber } = await params;
  const data = getQuestion(Number(examNumber), Number(questionNumber));
  if (!data) return {};
  return questionMeta(data.exam, data.question);
}

export default async function QuestionPage({ params }: Props) {
  const { examNumber: enStr, questionNumber: qnStr } = await params;
  const examNumber = Number(enStr);
  const questionNumber = Number(qnStr);

  const data = getQuestion(examNumber, questionNumber);
  if (!data) notFound();

  const { exam, question, totalQuestions } = data;

  const breadcrumbs = [
    { name: "홈", href: "/" },
    { name: "학습하기", href: "/study" },
    { name: `제${examNumber}회`, href: `/exam/${examNumber}/1` },
    {
      name: `${questionNumber}번`,
      href: `/exam/${examNumber}/${questionNumber}`,
    },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(questionJsonLd(exam, question)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)),
        }}
      />

      <BreadCrumb
        items={[
          { label: "학습하기", href: "/study" },
          { label: `제${examNumber}회`, href: `/exam/${examNumber}/1` },
          { label: `${questionNumber}번` },
        ]}
      />

      {/* Navigator — top position like original app */}
      <QuestionNav
        examNumber={examNumber}
        currentQuestion={questionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Question header */}
      <div className="flex items-baseline gap-2 mb-1 mt-4">
        <span className="text-2xl font-black text-indigo-500">
          Q{questionNumber}
        </span>
        <span className="text-sm font-medium text-slate-400">
          / {totalQuestions}
        </span>
        <span className="ml-auto rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
          {question.era}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        제{examNumber}회 &middot;{" "}
        {exam.examType === "advanced" ? "심화" : "기본"} &middot;{" "}
        {question.points}점 &middot; {question.category}
      </p>

      {/* Question card */}
      <QuestionWithTracking
        question={question}
        exam={exam}
        youtube={getYouTubeTimestamp(examNumber, questionNumber)}
      />
    </div>
  );
}
