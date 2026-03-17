import { Metadata } from "next";
import { Exam, Question } from "./types";

const SITE_NAME = "한국사기출";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

/** Generate metadata for individual question page. */
export function questionMeta(exam: Exam, question: Question): Metadata {
  const title = `제${exam.examNumber}회 한국사능력검정시험 ${question.questionNumber}번 정답 해설`;
  const keywordStr = question.keywords?.slice(0, 3).join(", ") || "";
  const description = `제${exam.examNumber}회 한국사능력검정시험 ${question.questionNumber}번 정답과 해설. ${question.era} ${question.category}, ${question.points}점.${keywordStr ? ` 키워드: ${keywordStr}` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: SITE_NAME,
    },
  };
}

/** Generate metadata for exam detail page. */
export function examMeta(exam: Exam): Metadata {
  const title = `제${exam.examNumber}회 한국사능력검정시험 기출문제`;
  const description = `제${exam.examNumber}회 한국사능력검정시험 (${exam.examDate}) ${exam.totalQuestions}문제 정답과 해설. 시대별·분야별 분석.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: SITE_NAME },
  };
}

/** Generate JSON-LD structured data for a question (Quiz schema). */
export function questionJsonLd(exam: Exam, question: Question): object {
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: `제${exam.examNumber}회 한국사능력검정시험 ${question.questionNumber}번`,
    about: { "@type": "Thing", name: "한국사능력검정시험" },
    hasPart: [
      {
        "@type": "Question",
        text: question.content,
        acceptedAnswer: {
          "@type": "Answer",
          text: question.choices[question.correctAnswer - 1],
        },
      },
    ],
  };
}

/** Generate BreadcrumbList JSON-LD. */
export function breadcrumbJsonLd(
  items: { name: string; href: string }[]
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}
