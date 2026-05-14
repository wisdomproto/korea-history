/**
 * SEO helpers for the multi-exam subject routes ([examSlug]/[subjectSlug]/*).
 * Mirrors lib/seo.ts (한능검) for 공무원·자격증 페이지.
 *
 * 패턴 D 키워드 = 한능검에서 검증된 "{과목} + 수식어" 조합
 * (시대별 정리 55.8%, 단원별 기출 51.4% 등 — docs/seo-strategy.html § 06).
 */
import type { Metadata } from "next";
import type { ExamType, Subject } from "./exam-types";
import type { Question } from "./types";

const SITE_NAME = "기출노트";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

/** 과목별 특화 키워드 확장 — 없는 과목은 generic 패턴 D만 사용 */
const SUBJECT_KEYWORD_EXT: Record<string, string[]> = {
  한국사: ["시대별 정리", "흐름 정리"],
  국어: ["어법 정리", "비문학 정리", "한자성어"],
  영어: ["문법 정리", "독해 정리", "어휘 정리"],
  행정법: ["판례 정리", "조문 정리"],
  행정법총론: ["판례 정리", "조문 정리"],
  행정학: ["이론 정리"],
  행정학개론: ["이론 정리"],
  형법: ["판례 정리"],
  형법총론: ["판례 정리"],
  형사소송법: ["판례 정리"],
  형사소송법개론: ["판례 정리"],
  헌법: ["판례 정리", "조문 정리"],
};

/**
 * 패턴 D 키워드 생성 — "{과목} 단원별 정리 / 단원별 기출 / 요약 / 정리본" 등.
 * 한능검 황금 키워드 패턴을 과목 단위로 복제. generateMetadata가 keywords를
 * 안 주면 루트 layout.tsx의 한능검 키워드를 상속하는 버그를 막는 역할도 함.
 */
export function civilSubjectKeywords(exam: ExamType, subject: Subject): string[] {
  const ex = exam.shortLabel;
  const subj = subject.label;
  const kws = [
    `${ex} ${subj}`,
    `${subj} 단원별 정리`,
    `${subj} 단원별 기출`,
    `${subj} 요약`,
    `${subj} 정리본`,
    `${ex} ${subj} 기출문제`,
    `${ex} 기출`,
  ];
  if (exam.category === "civil") kws.push(`공무원 ${subj}`);
  const ext = SUBJECT_KEYWORD_EXT[subj];
  if (ext) for (const e of ext) kws.push(`${subj} ${e}`);
  return Array.from(new Set(kws));
}

/** 과목 랜딩 메타 — /[examSlug]/[subjectSlug] */
export function civilSubjectMeta(exam: ExamType, subject: Subject): Metadata {
  const title = `${exam.shortLabel} ${subject.label} — 단원별 정리·기출문제 무료`;
  const description = `${exam.label} ${subject.label} 단원별 정리와 기출문제를 무료로. 회차별 풀이, 자동 오답노트, 학습 기록까지 — 기출노트.`;
  const path = `${exam.routes.main}/${subject.slug}`;
  return {
    title,
    description,
    keywords: civilSubjectKeywords(exam, subject),
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", siteName: SITE_NAME },
  };
}

/** 회차 목록 메타 — /[examSlug]/[subjectSlug]/exam */
export function civilExamListMeta(exam: ExamType, subject: Subject): Metadata {
  const title = `${exam.shortLabel} ${subject.label} 회차별 기출문제 — 무료 풀이`;
  const description = `${exam.label} ${subject.label} 회차별 기출문제 무료 풀이. 정답·해설 포함, 회원가입 없이 바로 — 기출노트.`;
  const path = `${exam.routes.main}/${subject.slug}/exam`;
  return {
    title,
    description,
    keywords: civilSubjectKeywords(exam, subject),
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", siteName: SITE_NAME },
  };
}

/** 개별 문제 메타 — /[examSlug]/[subjectSlug]/exam/[examId]/[questionNumber] */
export function civilQuestionMeta(
  exam: ExamType,
  subject: Subject,
  examId: string,
  qNum: number,
): Metadata {
  const title = `${exam.shortLabel} ${subject.label} 기출 ${qNum}번 정답·해설`;
  const description = `${exam.label} ${subject.label} 기출문제 ${qNum}번의 정답과 해설. 무료 풀이 — 기출노트.`;
  const path = `${exam.routes.main}/${subject.slug}/exam/${examId}/${qNum}`;
  return {
    title,
    description,
    keywords: civilSubjectKeywords(exam, subject),
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "article", siteName: SITE_NAME },
  };
}

/** 요약노트 메타 — /[examSlug]/[subjectSlug]/notes */
export function civilNotesMeta(
  exam: ExamType,
  subject: Subject,
  hasContent: boolean,
): Metadata {
  const title = `${exam.shortLabel} ${subject.label} 요약노트 — 단원별 정리`;
  const description = `${exam.label} ${subject.label} 단원별 요약노트. 빈출 주제 정리와 기출 연계 — 기출노트.`;
  const path = `${exam.routes.main}/${subject.slug}/notes`;
  return {
    title,
    description,
    keywords: civilSubjectKeywords(exam, subject),
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", siteName: SITE_NAME },
    ...(hasContent ? {} : { robots: { index: false, follow: true } }),
  };
}

/** Course JSON-LD — 과목 랜딩 */
export function civilCourseJsonLd(exam: ExamType, subject: Subject): object {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${exam.shortLabel} ${subject.label}`,
    description: `${exam.label} ${subject.label} 단원별 정리와 기출문제`,
    url: `${SITE_URL}${exam.routes.main}/${subject.slug}`,
    provider: { "@type": "Organization", name: "기출노트", url: SITE_URL },
    learningResourceType: "기출문제 + 요약노트 + 자동 오답노트",
    isAccessibleForFree: true,
    inLanguage: "ko",
  };
}

/** Quiz JSON-LD — 개별 문제 (lib/seo.ts questionJsonLd의 공무원/자격증 버전) */
export function civilQuizJsonLd(
  exam: ExamType,
  subject: Subject,
  examLabel: string,
  question: Question,
): object {
  const answer = question.choices[question.correctAnswer - 1];
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: `${exam.shortLabel} ${subject.label} ${examLabel} ${question.questionNumber}번`,
    about: { "@type": "Thing", name: `${exam.label} ${subject.label}` },
    educationalLevel: exam.label,
    isAccessibleForFree: true,
    hasPart: [
      {
        "@type": "Question",
        text: question.content,
        ...(answer ? { acceptedAnswer: { "@type": "Answer", text: answer } } : {}),
      },
    ],
  };
}
