import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllQuestionParams,
  getQuestion,
} from "@/lib/data";
import {
  questionMeta,
  questionJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import QuestionCard from "@/components/QuestionCard";
import PrevNextNav from "@/components/PrevNextNav";

interface Props {
  params: Promise<{ examNumber: string; questionNumber: string }>;
}

export async function generateStaticParams() {
  return getAllQuestionParams().map((p) => ({
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
    { name: "기출문제", href: "/exam" },
    { name: `제${examNumber}회`, href: `/exam/${examNumber}` },
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
          { label: "기출문제", href: "/exam" },
          { label: `제${examNumber}회`, href: `/exam/${examNumber}` },
          { label: `${questionNumber}번` },
        ]}
      />

      <h1 className="text-xl font-bold mb-1">
        제{examNumber}회 한국사능력검정시험 {questionNumber}번
        <span className="ml-2 text-sm font-normal text-gray-400">
          ({question.points}점)
        </span>
      </h1>
      <div className="mb-4 flex gap-2 text-xs">
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
          {question.era}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
          {question.category}
        </span>
      </div>

      <QuestionCard question={question} />

      {/* Keywords */}
      {question.keywords && question.keywords.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">
            🔗 키워드
          </h2>
          <div className="flex flex-wrap gap-1">
            {question.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <PrevNextNav
        prev={
          questionNumber > 1
            ? {
                href: `/exam/${examNumber}/${questionNumber - 1}`,
                label: `${questionNumber - 1}번`,
              }
            : undefined
        }
        next={
          questionNumber < totalQuestions
            ? {
                href: `/exam/${examNumber}/${questionNumber + 1}`,
                label: `${questionNumber + 1}번`,
              }
            : undefined
        }
        center={{ href: `/exam/${examNumber}`, label: "문제 목록" }}
      />
    </div>
  );
}
