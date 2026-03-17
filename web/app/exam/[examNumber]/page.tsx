import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllExamNumbers, getExamByNumber } from "@/lib/data";
import { examMeta, breadcrumbJsonLd } from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import PrevNextNav from "@/components/PrevNextNav";

interface Props {
  params: Promise<{ examNumber: string }>;
}

export async function generateStaticParams() {
  return getAllExamNumbers().map((n) => ({ examNumber: String(n) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { examNumber } = await params;
  const examFile = getExamByNumber(Number(examNumber));
  if (!examFile) return {};
  return examMeta(examFile.exam);
}

export default async function ExamDetailPage({ params }: Props) {
  const { examNumber: examNumberStr } = await params;
  const examNumber = Number(examNumberStr);
  const examFile = getExamByNumber(examNumber);
  if (!examFile) notFound();

  const { exam, questions } = examFile;
  const allExamNumbers = getAllExamNumbers();
  const currentIndex = allExamNumbers.indexOf(examNumber);
  const prevExam =
    currentIndex < allExamNumbers.length - 1
      ? allExamNumbers[currentIndex + 1]
      : null;
  const nextExam = currentIndex > 0 ? allExamNumbers[currentIndex - 1] : null;

  const breadcrumbs = [
    { name: "홈", href: "/" },
    { name: "기출문제", href: "/exam" },
    { name: `제${examNumber}회`, href: `/exam/${examNumber}` },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)),
        }}
      />
      <BreadCrumb
        items={[
          { label: "기출문제", href: "/exam" },
          { label: `제${examNumber}회` },
        ]}
      />

      <h1 className="text-2xl font-bold mb-1">
        제{examNumber}회 한국사능력검정시험
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {exam.examDate} &middot;{" "}
        {exam.examType === "advanced" ? "심화" : "기본"} &middot;{" "}
        {exam.totalQuestions}문제 &middot; {exam.timeLimitMinutes}분
      </p>

      <div className="grid gap-2">
        {questions
          .sort((a, b) => a.questionNumber - b.questionNumber)
          .map((q) => (
            <Link
              key={q.id}
              href={`/exam/${examNumber}/${q.questionNumber}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                  {q.questionNumber}
                </span>
                <span className="text-sm text-gray-700 line-clamp-1">
                  {q.content}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0 ml-2">
                <span>{q.era}</span>
                <span>{q.points}점</span>
              </div>
            </Link>
          ))}
      </div>

      <PrevNextNav
        prev={
          prevExam
            ? { href: `/exam/${prevExam}`, label: `제${prevExam}회` }
            : undefined
        }
        next={
          nextExam
            ? { href: `/exam/${nextExam}`, label: `제${nextExam}회` }
            : undefined
        }
        center={{ href: "/exam", label: "전체 목록" }}
      />
    </div>
  );
}
