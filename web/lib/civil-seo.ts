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

/**
 * 과목별 특화 키워드 확장 — 없는 과목은 generic 패턴 D만 사용.
 * 한능검 SE 30일 실측 황금 패턴 (시대별 정리 55.8% / 단원별 기출 51.4% / 정리본 24.8%)을
 * 과목 단위로 복제. generic과 일부 중복되지만 ext에 명시해 시그널 강화.
 *
 * 보강 원칙:
 *   1. 과목 특화 핵심 (판례·조문·이론·분개 등) — generic에 없는 것
 *   2. 단독 키워드 ("판례", "행정이론") — long-tail 잡기
 *   3. 9급 13과목 전체 ext 보유 (회계학·세법·교정학·사회복지·교육학·국제법·관세법 신규)
 */
const SUBJECT_KEYWORD_EXT: Record<string, string[]> = {
  // 공통 인문 — 한능검 cross 키워드 + 시대별 흐름.
  // generic("단원별 정리"·"정리본"·"요약본"·"빈출"·"핵심" 등)은 함수에서 자동 생성되므로
  // ext에는 한국사 특화 키워드만 ("시대별 정리"·"흐름"·"통사"·"사료" 등).
  한국사: [
    "시대별 정리",
    "흐름 정리",
    "기출",
    "통사",
    "사료",
  ],
  국어: ["어법 정리", "비문학 정리", "한자성어", "문법", "문학"],
  영어: ["문법 정리", "독해 정리", "어휘 정리", "독해", "문법"],

  // 법 과목 — 판례·조문 중심
  행정법: ["판례 정리", "조문 정리", "판례", "조문"],
  행정법총론: ["판례 정리", "조문 정리", "판례", "조문"],
  형법: ["판례 정리", "조문 정리", "판례", "조문"],
  형법총론: ["판례 정리", "조문 정리", "판례", "조문"],
  형사소송법: ["판례 정리", "조문 정리", "판례", "조문"],
  형사소송법개론: ["판례 정리", "조문 정리", "판례", "조문"],
  헌법: ["판례 정리", "조문 정리", "판례", "조문"],
  국제법: ["조약", "판례 정리", "조문 정리"],
  국제법개론: ["조약", "판례 정리", "조문 정리"],
  관세법: ["관세평가", "조문 정리", "원산지"],
  관세법개론: ["관세평가", "조문 정리", "원산지"],

  // 행정·정책 과목 — 이론 중심
  행정학: ["이론 정리", "행정이론"],
  행정학개론: ["이론 정리", "행정이론"],

  // 회계·세무 — 계정·세목 중심
  회계학: ["분개", "재무회계", "원가회계", "재무제표"],
  세법: ["소득세", "법인세", "부가가치세", "세목"],
  세법개론: ["소득세", "법인세", "부가가치세", "세목"],

  // 교정·복지·교육 — 분야 특화
  교정학: ["행형", "교정처우"],
  교정학개론: ["행형", "교정처우"],
  사회복지학: ["사회복지정책", "사회복지실천"],
  사회복지학개론: ["사회복지정책", "사회복지실천"],
  교육학: ["교육과정", "교수법", "교육심리"],
  교육학개론: ["교육과정", "교수법", "교육심리"],
};

/**
 * 패턴 D 키워드 생성 — "{과목} 단원별 정리 / 단원별 기출 / 요약 / 정리본" 등.
 * 한능검 황금 키워드 패턴을 과목 단위로 복제. generateMetadata가 keywords를
 * 안 주면 루트 layout.tsx의 한능검 키워드를 상속하는 버그를 막는 역할도 함.
 *
 * generic 패턴은 한능검 SE 30일 실측 황금 7개 중 generic 가능한 것 모두 반영:
 *   - 단원별 정리 / 단원별 기출 / 요약 / 정리본 / 요약본 / 빈출 정리 / 핵심 정리 / 기출문제 / 기출
 *   - 공무원 시그널은 civil category에 한해 추가 ("공무원 {과목}" / "공무원 {과목} 기출")
 */
export function civilSubjectKeywords(exam: ExamType, subject: Subject): string[] {
  const ex = exam.shortLabel;
  const subj = subject.label;
  const kws = [
    `${ex} ${subj}`,
    `${subj} 단원별 정리`,
    `${subj} 단원별 기출`,
    `${subj} 요약`,
    `${subj} 요약본`,
    `${subj} 정리본`,
    `${subj} 빈출 정리`,
    `${subj} 핵심 정리`,
    `${ex} ${subj} 기출문제`,
    `${ex} 기출`,
  ];
  if (exam.category === "civil") {
    kws.push(`공무원 ${subj}`, `공무원 ${subj} 기출`, `공무원 ${subj} 정리`);
  }
  const ext = SUBJECT_KEYWORD_EXT[subj];
  if (ext) for (const e of ext) kws.push(`${subj} ${e}`);
  return Array.from(new Set(kws));
}

/**
 * 과목 랜딩 메타 — /[examSlug]/[subjectSlug]
 * indexable=false면 noindex (수동 본문 없는 자동 가이드/CBT 과목 — AdSense 저가치 표면 제외).
 */
export function civilSubjectMeta(
  exam: ExamType,
  subject: Subject,
  indexable = true,
): Metadata {
  const title = `${exam.shortLabel} ${subject.label} — 단원별 정리·기출문제 무료`;
  const description = `${exam.label} ${subject.label} 단원별 정리와 기출문제를 무료로. 회차별 풀이, 자동 오답노트, 학습 기록까지 — 기출노트.`;
  const path = `${exam.routes.main}/${subject.slug}`;
  return {
    title,
    description,
    keywords: civilSubjectKeywords(exam, subject),
    alternates: { canonical: path },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: path, type: "website", siteName: SITE_NAME },
  };
}

/**
 * 회차 목록 메타 — /[examSlug]/[subjectSlug]/exam
 * 회차 목록은 링크 나열(thin)이고 키워드는 과목 랜딩이 커버 → 항상 noindex (follow는 유지).
 */
export function civilExamListMeta(exam: ExamType, subject: Subject): Metadata {
  const title = `${exam.shortLabel} ${subject.label} 회차별 기출문제 — 무료 풀이`;
  const description = `${exam.label} ${subject.label} 회차별 기출문제 무료 풀이. 정답·해설 포함, 회원가입 없이 바로 — 기출노트.`;
  const path = `${exam.routes.main}/${subject.slug}/exam`;
  return {
    title,
    description,
    keywords: civilSubjectKeywords(exam, subject),
    alternates: { canonical: path },
    robots: { index: false, follow: true },
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
    // 개별 CBT/자격증 문제 = 비독창(외부 출처) + 수십만개 동일 템플릿 → 항상 noindex.
    // 특정 문제 번호는 검색 수요 0이라 SEO 손실 없음. follow=true로 링크 자산만 전달.
    robots: { index: false, follow: true },
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
