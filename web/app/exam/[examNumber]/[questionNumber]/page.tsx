import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllQuestionParams, getQuestion } from "@/lib/data";
import { getYouTubeTimestamp } from "@/lib/youtube";
import { questionMeta, questionJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import QuestionWithTracking from "@/components/QuestionWithTracking";
import QuestionNav from "@/components/QuestionNav";
import PrevNextNav from "@/components/PrevNextNav";
import ShareButtons from "@/components/ShareButtons";

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

      {/* Question header + share */}
      <div className="flex items-center justify-between mb-4 mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-indigo-500">
            {questionNumber}.
          </span>
          <span className="text-sm font-medium text-slate-400">
            [{question.points}점]
          </span>
        </div>
        <ShareButtons
          title={`제${examNumber}회 한능검 ${questionNumber}번 — 정답은?`}
          description={`${question.era} · ${question.category} | 정답과 해설 보기`}
          buttonText="문제 풀어보기"
        />
      </div>

      {/* Question card */}
      <QuestionWithTracking
        question={question}
        exam={exam}
        youtube={getYouTubeTimestamp(examNumber, questionNumber)}
      />

      {/* Bottom prev/next navigation */}
      <PrevNextNav
        prev={
          questionNumber > 1
            ? { href: `/exam/${examNumber}/${questionNumber - 1}`, label: `${questionNumber - 1}번` }
            : undefined
        }
        next={
          questionNumber < totalQuestions
            ? { href: `/exam/${examNumber}/${questionNumber + 1}`, label: `${questionNumber + 1}번` }
            : undefined
        }
        center={{ href: `/exam/${examNumber}/1`, label: `제${examNumber}회 전체` }}
      />
    </div>
  );
}
