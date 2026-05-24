import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  getAllExamTypes,
  getExamTypeWithSubjects,
  getCategoryById,
  getExamSchedule,
  getNextExamEvent,
  getJobSeriesChildren,
  type ExamType,
  type ExamTypeWithSubjects,
  type ResolvedSubjectRef,
  type ExamScheduleEvent,
} from "@/lib/exam-types";
import BreadCrumb from "@/components/BreadCrumb";
import KoreanHistoryLanding from "@/components/KoreanHistoryLanding";
import OtherExamsSection from "@/components/OtherExamsSection";
import { getNoteForSubjectLabel } from "@/lib/civil-notes";

interface PageProps {
  params: Promise<{ examSlug: string }>;
}

// ISR — 한능검만 prerender (메인 트래픽). 나머지 546 ExamType은 첫 요청 시 SSR + 1일 cache.
// Phase 2 (2026-05-05): 547개 prerender → 1개로 줄여 빌드 시간 단축.
// 자식 라우트 [subjectSlug]/* 는 이미 force-dynamic + revalidate 라 일관됨.
export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return [{ examSlug: "한능검" }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug } = await params;
  const slug = decodeURIComponent(examSlug);
  const exam = getExamTypeWithSubjects(slug);
  if (!exam) return { title: "시험 없음" };

  return {
    title: exam.seo.title,
    description: exam.seo.description,
    keywords: exam.seo.keywords,
    alternates: { canonical: exam.routes.main },
    openGraph: {
      title: exam.seo.title,
      description: exam.seo.description,
      url: `https://gcnote.co.kr${exam.routes.main}`,
    },
  };
}

export default async function ExamSlugPage({ params }: PageProps) {
  const { examSlug } = await params;
  const slug = decodeURIComponent(examSlug);
  const exam = getExamTypeWithSubjects(slug);

  if (!exam) notFound();

  // 한능검 — 풍부한 legacy 랜딩 + 다른 시험 섹션
  if (exam.id === "korean-history") {
    return (
      <>
        <KoreanHistoryLanding />
        <OtherExamsSection currentExamId="korean-history" />
      </>
    );
  }

  const category = getCategoryById(exam.category);
  const schedule = getExamSchedule(exam.id);
  const nextEvent = getNextExamEvent(exam.id);

  // Phase 0: 한국사 콘텐츠 = 한능검 routes 재사용
  const HISTORY_ROUTES = {
    exam: "/exam",
    notes: "/notes",
    study: "/study",
  };

  const certBadge = exam.subjects.required.find(
    (r) => r.subject.id === "korean-history" && r.certAccepted?.length,
  );

  const childExams = exam.isContainer ? getJobSeriesChildren(exam.id) : [];
  const jsonLd = buildExamPageJsonLd(exam, category?.label ?? "시험", childExams);

  return (
    <main className="bg-[var(--gc-bg)] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-5 sm:px-6 md:px-8 py-10 md:py-14">
        <BreadCrumb
          items={[
            { label: "기출노트", href: "/" },
            { label: category?.label ?? "시험", href: "/" },
            { label: exam.label },
          ]}
        />

        <ExamHero exam={exam} certBadge={certBadge} nextEvent={nextEvent} />

        {exam.isContainer ? (
          <>
            <KoreanHistoryHub exam={exam} />
            <JobSeriesCategoryGuide parentId={exam.id} />
            <JobSeriesSection parentId={exam.id} />
            <CommonSubjectsStrategy exam={exam} />
          </>
        ) : (
          <>
            <SubjectsSection
              required={exam.subjects.required}
              selectable={exam.subjects.selectable}
              historyRoutes={HISTORY_ROUTES}
              examSlug={exam.slug}
            />
            <SubjectStrategyByJobSeries exam={exam} />
          </>
        )}

        <MarketSection exam={exam} />

        {schedule.length > 0 && <ScheduleSection events={schedule} />}

        <FaqSection exam={exam} certBadge={certBadge} />

        <SeoProse exam={exam} certBadge={certBadge} />
      </div>

      <OtherExamsSection currentExamId={exam.id} />
    </main>
  );
}

// ============================================================
// Hero — 시험명 + 응시자 수 강조 + D-Day
// ============================================================

function ExamHero({
  exam,
  nextEvent,
}: {
  exam: ExamTypeWithSubjects;
  certBadge?: ResolvedSubjectRef;
  nextEvent: ReturnType<typeof getNextExamEvent>;
}) {
  return (
    <section className="mt-6 md:mt-8 grid gap-8 md:grid-cols-[1fr_280px] items-start">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--gc-amber)]">
          <span>{exam.icon}</span>
          <span>{exam.shortLabel}</span>
        </div>

        <h1 className="mt-3 font-serif-kr text-4xl md:text-6xl font-black leading-tight text-[var(--gc-ink)]">
          {exam.label}
        </h1>

        <p className="mt-4 max-w-2xl text-base md:text-lg text-[var(--gc-ink2)]">
          {exam.description}
        </p>
      </div>

      {nextEvent && <DDayCard event={nextEvent} />}
    </section>
  );
}

function DDayCard({ event }: { event: NonNullable<ReturnType<typeof getNextExamEvent>> }) {
  const examDate = new Date(event.date + "T00:00:00Z");
  const dateStr = examDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="rounded-2xl border-2 border-[var(--gc-amber)] bg-white p-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)]">
        다음 시험
      </div>
      <div className="mt-2 font-serif-kr text-5xl font-black text-[var(--gc-ink)] leading-none">
        D-{event.daysUntil}
      </div>
      <div className="mt-3 text-sm font-bold text-[var(--gc-ink)]">{event.label}</div>
      <div className="mt-1 text-xs text-[var(--gc-ink2)]">{dateStr}</div>
    </div>
  );
}

// ============================================================
// 한능검 인증 가이드
// ============================================================

function CertGuide({
  exam,
  certBadge,
}: {
  exam: ExamTypeWithSubjects;
  certBadge: ResolvedSubjectRef;
}) {
  const grade = certBadge.certAccepted?.[0] ?? "한능검";
  const isFuture = grade.includes("2027");

  return (
    <section className="mt-12 rounded-3xl border border-[var(--gc-hairline)] bg-gradient-to-br from-[#CCFBF1]/40 via-white to-white p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="text-4xl">🏛️</div>
        <div>
          <h2 className="font-serif-kr text-2xl md:text-3xl font-black text-[var(--gc-ink)]">
            {exam.shortLabel} 한국사 = {grade}
          </h2>
          <p className="mt-3 text-sm md:text-base text-[var(--gc-ink2)]">
            {isFuture ? (
              <>
                <strong className="text-[var(--gc-ink)]">2027년부터</strong> 공무원 한국사 시험이 한능검으로 대체됩니다.
                지금부터 한능검 콘텐츠로 미리 대비하면 1년 먼저 끝낼 수 있습니다.
              </>
            ) : (
              <>
                <strong className="text-[var(--gc-ink)]">현재 시행 중</strong> — {exam.shortLabel} 응시자는
                한능검 인증서로 한국사 시험을 대체합니다. 기출노트의 한능검 1,900문항 + 87 요약노트로 무료 대비 가능.
              </>
            )}
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-[var(--gc-ink2)]">
            <li>✓ 1,900+ 한능검 기출문제 무료 풀이</li>
            <li>✓ 87개 시대별 요약노트 (한자 없는 교과서 문체)</li>
            <li>✓ 자동 오답노트 + 학습 세션</li>
            <li>✓ 문제 풀면 관련 요약노트 section 자동 연결</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// 학습 시작 CTA
// ============================================================

function LearningCta({
  historyRoutes,
  certBadge,
}: {
  historyRoutes: { exam: string; notes: string; study: string };
  certBadge?: ResolvedSubjectRef;
}) {
  if (!certBadge) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)] mb-6">
        지금 시작
      </h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <CtaCard
          href={historyRoutes.exam}
          label="기출 풀기"
          desc="회차별 1,900+ 문항"
          icon="📝"
          primary
        />
        <CtaCard
          href={historyRoutes.notes}
          label="요약노트"
          desc="시대별 87개 노트"
          icon="📚"
        />
        <CtaCard
          href={historyRoutes.study}
          label="학습 세션"
          desc="맞춤형 + 키워드별 학습"
          icon="🎯"
        />
      </div>
    </section>
  );
}

function CtaCard({
  href,
  label,
  desc,
  icon,
  primary,
}: {
  href: string;
  label: string;
  desc: string;
  icon: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition-all hover:scale-[1.01] ${
        primary
          ? "border-[var(--gc-amber)] bg-[var(--gc-ink)] text-white"
          : "border-[var(--gc-hairline)] bg-white text-[var(--gc-ink)] hover:border-[var(--gc-amber)]"
      }`}
    >
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 font-serif-kr text-xl font-bold">{label}</div>
      <div className={`mt-1 text-sm ${primary ? "text-white/70" : "text-[var(--gc-ink2)]"}`}>
        {desc}
      </div>
      <div
        className={`mt-4 inline-flex items-center gap-1 text-sm font-bold ${
          primary ? "text-[#FED7AA]" : "text-[var(--gc-amber)]"
        }`}
      >
        시작 <span className="transition-transform group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

// ============================================================
// JSON-LD 구조화 데이터 (BreadcrumbList + Course/Program)
// ============================================================

function buildExamPageJsonLd(
  exam: ExamTypeWithSubjects,
  categoryLabel: string,
  children: ExamType[],
) {
  const baseUrl = "https://gcnote.co.kr";
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "기출노트", item: baseUrl },
      { "@type": "ListItem", position: 2, name: categoryLabel, item: `${baseUrl}/` },
      { "@type": "ListItem", position: 3, name: exam.label, item: `${baseUrl}${exam.routes.main}` },
    ],
  };

  // 컨테이너 부모: EducationalOccupationalProgram (직렬 = potentialOccupation)
  if (exam.isContainer && children.length > 0) {
    const program = {
      "@context": "https://schema.org",
      "@type": "EducationalOccupationalProgram",
      name: exam.label,
      description: exam.description,
      url: `${baseUrl}${exam.routes.main}`,
      provider: {
        "@type": "Organization",
        name: "기출노트",
        url: baseUrl,
      },
      hasCourse: children.map((c) => ({
        "@type": "Course",
        name: c.label,
        description: c.description,
        url: `${baseUrl}${c.routes.main}`,
        provider: { "@type": "Organization", name: "기출노트", url: baseUrl },
      })),
    };
    return [breadcrumb, program];
  }

  // 단일/직렬 ExamType: Course
  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: exam.label,
    description: exam.description,
    url: `${baseUrl}${exam.routes.main}`,
    provider: { "@type": "Organization", name: "기출노트", url: baseUrl },
    learningResourceType: "기출문제 + 요약노트 + 자동 오답노트",
    isAccessibleForFree: true,
    inLanguage: "ko",
    educationalLevel: "공무원·자격증·한능검 응시생",
  };
  return [breadcrumb, course];
}

// ============================================================
// Korean History Hub — 부모 컨테이너 전용. 모든 직렬 공통 한국사 = 한능검.
// "공무원 한국사" Tier S (vol 1,160) + "9급 한국사" Tier B 키워드 흡수.
// ============================================================

function KoreanHistoryHub({ exam }: { exam: ExamTypeWithSubjects }) {
  // 모든 9급 부모 컨테이너는 한국사 ref 보유 — cert grade 자동 추출
  const historyRef = exam.subjects.required.find(
    (r) => r.subject.id === "korean-history",
  );
  const grade = historyRef?.certAccepted?.[0] ?? "한능검";
  const isFuture = grade.includes("2027");

  return (
    <section className="mt-14 rounded-3xl border-2 border-[var(--gc-amber)] bg-gradient-to-br from-[#FFF7ED] via-white to-white p-6 md:p-10">
      <div className="flex items-start gap-4 mb-6">
        <div className="text-5xl shrink-0">🏛️</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)] font-bold">
              {exam.shortLabel} 한국사
            </span>
            <span className="rounded-full bg-[#B45309] text-white px-2 py-0.5 text-[10px] font-bold">
              한능검 무료
            </span>
          </div>
          <h2 className="font-serif-kr text-2xl md:text-3xl font-black text-[var(--gc-ink)] leading-tight">
            {exam.shortLabel} 한국사 = {grade}
          </h2>
          <p className="mt-3 text-sm md:text-base text-[var(--gc-ink2)] max-w-2xl">
            {isFuture ? (
              <>
                <strong className="text-[var(--gc-ink)]">2027년부터</strong> {exam.shortLabel} 한국사 시험은
                한능검으로 통합됩니다. 지금부터 한능검으로 미리 합격 등급을 따두면 1과목을 일찍 끝낼 수 있습니다.
              </>
            ) : (
              <>
                <strong className="text-[var(--gc-ink)]">현재 시행 중</strong> — {exam.shortLabel} 응시자는
                한능검 인증서로 한국사 시험을 대체합니다. 기출노트의 한능검 콘텐츠로 무료 학습 가능.
              </>
            )}
          </p>
          <ul className="mt-4 grid gap-1.5 text-sm text-[var(--gc-ink2)] sm:grid-cols-2">
            <li>✓ 1,900+ 한능검 기출문제 무료 풀이</li>
            <li>✓ 87개 시대별 요약노트 (한자 없는 교과서 문체)</li>
            <li>✓ 자동 오답노트 + 학습 세션</li>
            <li>✓ 문제↔노트 section 자동 연결</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <HistoryHubCta href="/exam" label="기출 풀기" desc="1,900+ 문항" icon="📝" primary />
        <HistoryHubCta href="/notes" label="요약노트" desc="시대별 87편" icon="📚" />
        <HistoryHubCta href="/wrong-answers" label="오답노트" desc="자동 수집" icon="✗" />
        <HistoryHubCta href="/my-record" label="내 기록" desc="점수·약점" icon="📊" />
      </div>
    </section>
  );
}

function HistoryHubCta({
  href,
  label,
  desc,
  icon,
  primary,
}: {
  href: string;
  label: string;
  desc: string;
  icon: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 transition-all hover:scale-[1.02] ${
        primary
          ? "border-[var(--gc-amber)] bg-[var(--gc-ink)] text-white"
          : "border-[var(--gc-hairline)] bg-white text-[var(--gc-ink)] hover:border-[var(--gc-amber)]"
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-serif-kr text-base font-bold">{label}</div>
      <div className={`mt-0.5 text-xs ${primary ? "text-white/70" : "text-[var(--gc-ink2)]"}`}>
        {desc}
      </div>
      <div
        className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${
          primary ? "text-[#FED7AA]" : "text-[var(--gc-amber)]"
        }`}
      >
        시작 <span className="transition-transform group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

// ============================================================
// JobSeriesCategoryGuide — 직군별 분류 + 적성 매칭. 24직렬 압도 부담 완화 + 체류시간 보강.
// ============================================================

type JobGroup = {
  id: string;
  label: string;
  icon: string;
  desc: string;
  pattern: RegExp;
};

const JOB_GROUPS: JobGroup[] = [
  {
    id: "admin",
    label: "행정 직군",
    icon: "📋",
    desc: "공공정책 기획·집행. 가장 인기 + 합격선 높음. 전공 부담 가장 적은 편.",
    pattern: /(일반행정|교육행정|선거행정|통계|사회복지|직업상담)/,
  },
  {
    id: "justice",
    label: "법무·교정 직군",
    icon: "⚖️",
    desc: "검찰·교정·보호직 등 법무 업무. 형법·형사소송법 전공 부담. 안정성 ↑.",
    pattern: /(검찰|교정|보호)/,
  },
  {
    id: "finance",
    label: "세무·재무 직군",
    icon: "💰",
    desc: "세무·관세 업무. 세법·회계학 전공. 회계 배경 있으면 유리.",
    pattern: /(세무|관세)/,
  },
  {
    id: "foreign",
    label: "외무 직군",
    icon: "🌏",
    desc: "재외공관 영사 업무. 어학 능력 중요. 별도 선발 인원 적음.",
    pattern: /(외무)/,
  },
  {
    id: "technical",
    label: "기술 직군",
    icon: "🔧",
    desc: "건축·토목·전기·전산·임업 등 12개 직렬. 전공 자격증 가산점 적용. 비전공자 진입 어려움.",
    pattern: /./, // catch-all (마지막)
  },
];

function categorizeJob(shortLabel: string): JobGroup {
  for (const g of JOB_GROUPS) {
    if (g.pattern.test(shortLabel)) return g;
  }
  return JOB_GROUPS[JOB_GROUPS.length - 1];
}

function JobSeriesCategoryGuide({ parentId }: { parentId: string }) {
  const children = getJobSeriesChildren(parentId);
  if (children.length === 0) return null;

  // 직군별 묶기 (순서는 JOB_GROUPS 정의 순)
  const byGroup = new Map<string, { group: JobGroup; items: ExamType[] }>();
  for (const child of children) {
    const group = categorizeJob(child.shortLabel);
    if (!byGroup.has(group.id)) byGroup.set(group.id, { group, items: [] });
    byGroup.get(group.id)!.items.push(child);
  }
  // JOB_GROUPS 정의 순으로 정렬
  const groups = JOB_GROUPS.map((g) => byGroup.get(g.id)).filter(
    (x): x is { group: JobGroup; items: ExamType[] } => Boolean(x),
  );

  return (
    <section className="mt-14">
      <div className="mb-6">
        <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)]">
          어떤 직렬을 골라야 할까?
        </h2>
        <p className="mt-2 text-sm text-[var(--gc-ink2)]">
          전체 {children.length}직렬을 직군별로 나눠 정리. 본인 전공·적성에 맞는 직군을 먼저 보고
          세부 직렬은 카드에서 클릭.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(({ group, items }) => (
          <div
            key={group.id}
            className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-5"
          >
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl">{group.icon}</span>
              <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)]">
                {group.label}
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)]">
                {items.length}직렬
              </span>
            </div>
            <p className="text-xs text-[var(--gc-ink2)] mb-3 leading-relaxed">{group.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((c) => (
                <Link
                  key={c.id}
                  href={c.routes.main}
                  className="rounded-full border border-[var(--gc-hairline)] px-3 py-1 text-xs text-[var(--gc-ink)] hover:border-[var(--gc-amber)] hover:bg-[#FFF7ED] transition-colors"
                >
                  {c.shortLabel}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// CommonSubjectsStrategy — 공통 3과목(국어/영어/한국사) 학습 전략. 한국사 cross-promo 강화.
// ============================================================

function CommonSubjectsStrategy({ exam }: { exam: ExamTypeWithSubjects }) {
  const historyRef = exam.subjects.required.find(
    (r) => r.subject.id === "korean-history",
  );
  const grade = historyRef?.certAccepted?.[0] ?? "한능검 3급";

  return (
    <section className="mt-14 rounded-3xl border border-[var(--gc-hairline)] bg-white p-6 md:p-10">
      <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)] mb-2">
        공통 3과목 학습 전략 — 국어·영어·한국사
      </h2>
      <p className="text-sm text-[var(--gc-ink2)] mb-6">
        모든 직렬 공통 과목. 전공 과목 부담이 직렬마다 다르지만 공통 3과목은 동일하므로
        먼저 공통 → 전공 순으로 학습 계획을 잡는 게 효율적.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-[var(--gc-amber)] bg-gradient-to-br from-[#FFF7ED] to-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏛️</span>
            <h3 className="font-serif-kr text-base font-bold text-[var(--gc-ink)]">한국사</h3>
            <span className="rounded-full bg-[#B45309] text-white px-2 py-0.5 text-[9px] font-bold">
              한능검 무료
            </span>
          </div>
          <p className="text-xs text-[var(--gc-ink2)] leading-relaxed mb-3">
            {exam.shortLabel} 한국사는 <strong>{grade}</strong> 인증으로 대체.
            기출노트의 한능검 1,900+ 기출과 87 시대별 요약노트로 무료 학습.
          </p>
          <Link
            href="/exam"
            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--gc-amber)] hover:underline"
          >
            한능검 학습 시작 →
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📖</span>
            <h3 className="font-serif-kr text-base font-bold text-[var(--gc-ink)]">국어</h3>
          </div>
          <p className="text-xs text-[var(--gc-ink2)] leading-relaxed mb-3">
            어법·비문학·문학 빈출 위주. 사자성어와 한자어, 띄어쓰기·맞춤법 같은 반복 출제 영역을
            먼저 정리하면 안정 점수 확보.
          </p>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gc-ink2)]">
            준비중 — 2026 하반기
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔤</span>
            <h3 className="font-serif-kr text-base font-bold text-[var(--gc-ink)]">영어</h3>
          </div>
          <p className="text-xs text-[var(--gc-ink2)] leading-relaxed mb-3">
            독해·문법·어휘 위주. 공무원 영어는 비즈니스 영어와 다르게 정형화된 문법·논리 독해 중심.
            기출 5년치 반복으로 출제 패턴 익히기.
          </p>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gc-ink2)]">
            준비중 — 2026 하반기
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-[var(--gc-bg)] p-4">
        <h4 className="font-serif-kr text-sm font-bold text-[var(--gc-ink)] mb-2">
          ⏰ 추천 학습 흐름
        </h4>
        <ul className="space-y-1.5 text-xs text-[var(--gc-ink2)]">
          <li>
            <strong className="text-[var(--gc-ink)]">1~2개월차</strong>: 한국사 한능검 합격 등급 확보 →
            한 과목 영구 해결
          </li>
          <li>
            <strong className="text-[var(--gc-ink)]">3~4개월차</strong>: 전공 과목 개념 잡기 + 국어/영어 기출
            루틴화
          </li>
          <li>
            <strong className="text-[var(--gc-ink)]">5~6개월차</strong>: 5개 과목 전체 회차별 기출 반복 +
            오답 집중
          </li>
        </ul>
      </div>
    </section>
  );
}

// ============================================================
// SubjectStrategyByJobSeries — 직렬 자식 페이지 학습 전략. 공통 3과목 + 직렬 전공 그룹.
// ============================================================

function SubjectStrategyByJobSeries({ exam }: { exam: ExamTypeWithSubjects }) {
  // 한능검 본인은 표시 안 함 (자체 풍부 랜딩)
  if (exam.id === "korean-history") return null;

  const requiredHistory = exam.subjects.required.find(
    (r) => r.subject.id === "korean-history",
  );
  const requiredCommonNon = exam.subjects.required.filter(
    (r) => r.subject.id !== "korean-history",
  );
  const electives = exam.subjects.selectable ?? [];

  // 직렬 전공 = selectable (한국사·국어·영어 제외). 없으면 표시 안 함.
  if (electives.length === 0 && requiredCommonNon.length === 0) return null;

  const grade = requiredHistory?.certAccepted?.[0] ?? "한능검 3급";
  const parentLabel = exam.parentExamId ? "직렬" : "";

  return (
    <section className="mt-14 rounded-3xl border border-[var(--gc-hairline)] bg-white p-6 md:p-10">
      <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)] mb-2">
        {exam.shortLabel} 학습 전략 — 공통 + 전공 균형
      </h2>
      <p className="text-sm text-[var(--gc-ink2)] mb-6">
        공통 3과목(국어·영어·한국사)은 모든 직렬과 동일, 전공은 {exam.shortLabel}{parentLabel} 특화.
        공통은 미리 끝내고 전공에 집중하는 6:4 시간 배분이 합격선 안정 확보에 유리.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 공통 3과목 — 한국사 우선 강조 */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)]">
              📚 공통 3과목 (모든 직렬 동일)
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)]">
              60% 시간
            </span>
          </div>

          {requiredHistory && (
            <div className="rounded-2xl border-2 border-[var(--gc-amber)] bg-gradient-to-br from-[#FFF7ED] to-white p-4 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🏛️</span>
                <span className="font-serif-kr text-sm font-bold text-[var(--gc-ink)]">한국사</span>
                <span className="rounded-full bg-[#B45309] text-white px-2 py-0.5 text-[9px] font-bold">
                  한능검 무료
                </span>
              </div>
              <p className="text-xs text-[var(--gc-ink2)] leading-relaxed mb-2">
                <strong>{grade}</strong> 인증으로 대체. 한능검 1,900+ 기출 + 87 시대별 요약노트
                무료 학습. 평균 1~2개월 준비로 합격 등급 도달.
              </p>
              <Link
                href="/exam"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--gc-amber)] hover:underline"
              >
                한능검 학습 시작 →
              </Link>
            </div>
          )}

          {requiredCommonNon.map((r) => (
            <div
              key={r.subject.id}
              className="rounded-2xl border border-[var(--gc-hairline)] bg-[var(--gc-bg)]/40 p-4 mb-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{r.subject.id === "english" ? "🔤" : "📖"}</span>
                <span className="font-serif-kr text-sm font-bold text-[var(--gc-ink)]">
                  {r.subject.label}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gc-ink2)]">
                  준비중
                </span>
              </div>
              <p className="text-xs text-[var(--gc-ink2)] leading-relaxed">
                {r.subject.description ||
                  "기출 5년치 반복 + 빈출 영역 정리. 2026 하반기 콘텐츠 추가 예정."}
              </p>
            </div>
          ))}
        </div>

        {/* 직렬 전공 — selectable */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)]">
              🎯 {exam.shortLabel} 전공 ({electives.length}과목)
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)]">
              40% 시간
            </span>
          </div>

          {electives.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--gc-hairline)] bg-white/60 p-4 text-xs text-[var(--gc-ink2)]">
              전공 과목 정보 없음.
            </div>
          ) : (
            electives.map((r) => {
              const note = getNoteForSubjectLabel(r.subject.label);
              const href = note
                ? `/${encodeURIComponent(exam.slug)}/${encodeURIComponent(r.subject.slug)}/notes`
                : r.status === "live"
                  ? `/${encodeURIComponent(exam.slug)}/${encodeURIComponent(r.subject.slug)}`
                  : null;
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📐</span>
                      <span className="font-serif-kr text-sm font-bold text-[var(--gc-ink)]">
                        {r.subject.label}
                      </span>
                    </div>
                    {note && (
                      <span className="rounded-full bg-[#FED7AA] text-[#B45309] px-2 py-0.5 text-[9px] font-bold">
                        📝 단권화
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--gc-ink2)] leading-relaxed">
                    {note
                      ? `${note.topics}단원 · ${note.keywords}키워드 · 빈출 100% 커버. 본문 단권화 노트 완비.`
                      : r.subject.description ||
                        "기출문제 + 단권화 자동 가이드 제공. 본문 노트는 트래픽 보고 단계적 확장."}
                  </p>
                </>
              );
              return (
                <div key={r.subject.id} className="mb-3">
                  {href ? (
                    <Link
                      href={href}
                      className="block rounded-2xl border border-[var(--gc-hairline)] bg-white p-4 hover:border-[var(--gc-amber)] hover:shadow-sm transition-all"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white/60 p-4">
                      {inner}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-[var(--gc-bg)] p-4">
        <h4 className="font-serif-kr text-sm font-bold text-[var(--gc-ink)] mb-2">
          ⏰ {exam.shortLabel} 추천 학습 흐름
        </h4>
        <ul className="space-y-1.5 text-xs text-[var(--gc-ink2)]">
          <li>
            <strong className="text-[var(--gc-ink)]">1~2개월차</strong>: 한국사 한능검 합격 등급 확보 → 1과목 영구 해결
          </li>
          <li>
            <strong className="text-[var(--gc-ink)]">3~5개월차</strong>: 전공 {electives.length}과목 개념 잡기 + 국어/영어 기출 루틴화
          </li>
          <li>
            <strong className="text-[var(--gc-ink)]">6~9개월차</strong>: 전체 회차별 기출 반복 + 오답 집중 + 약점 직렬 전공 보강
          </li>
        </ul>
      </div>
    </section>
  );
}

// ============================================================
// Job-series cards (직렬 분리된 부모 ExamType용)
// ============================================================

function JobSeriesSection({ parentId }: { parentId: string }) {
  const children = getJobSeriesChildren(parentId);
  if (children.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)]">
        직렬 선택
      </h2>
      <p className="mt-2 text-sm text-[var(--gc-ink2)]">
        본인 직렬을 선택하면 해당 과목 셋만 보여줘. 한국사·국어·영어는 모든 직렬 공통.
      </p>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {children.map((c) => (
          <JobSeriesCard key={c.id} exam={c} />
        ))}
      </div>
    </section>
  );
}

function JobSeriesCard({ exam }: { exam: ExamType }) {
  const subjN =
    exam.subjects.required.length + (exam.subjects.selectable?.length ?? 0);
  return (
    <Link
      href={exam.routes.main}
      className="group rounded-2xl border border-[var(--gc-hairline)] bg-white p-4 transition-all hover:border-[var(--gc-amber)] hover:shadow-sm no-underline"
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{exam.icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gc-ink2)]">
          {subjN}과목
        </span>
      </div>
      <h3 className="mt-3 font-serif-kr text-base font-bold text-[var(--gc-ink)]">
        {exam.shortLabel}
      </h3>
      <p className="mt-1 text-xs text-[var(--gc-ink2)] line-clamp-2">
        {exam.description}
      </p>
      <div className="mt-3 text-xs font-bold text-[var(--gc-amber)]">
        선택 <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>
      </div>
    </Link>
  );
}

// ============================================================
// Subject cards
// ============================================================

function SubjectsSection({
  required,
  selectable,
  historyRoutes,
  examSlug,
}: {
  required: ResolvedSubjectRef[];
  selectable: ResolvedSubjectRef[];
  historyRoutes: { exam: string; notes: string; study: string };
  examSlug: string;
}) {
  const all = [...required, ...selectable];
  if (all.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)]">
        시험 과목
      </h2>
      <p className="mt-2 text-sm text-[var(--gc-ink2)]">
        한국사는 한능검 콘텐츠로 즉시 학습. 다른 과목은 순차 추가 예정.
      </p>

      <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {required.map((sr) => (
          <SubjectCard key={sr.subject.id} data={sr} historyRoutes={historyRoutes} examSlug={examSlug} />
        ))}
        {selectable.map((sr) => (
          <SubjectCard key={sr.subject.id} data={sr} historyRoutes={historyRoutes} examSlug={examSlug} optional />
        ))}
      </div>
    </section>
  );
}

function SubjectCard({
  data,
  historyRoutes,
  examSlug,
  optional,
}: {
  data: ResolvedSubjectRef;
  historyRoutes: { exam: string; notes: string; study: string };
  examSlug: string;
  optional?: boolean;
}) {
  const isLive = data.status === "live";
  const isHistory = data.subject.id === "korean-history";

  // 9급 공무원 자동 단권화 매칭 (Subject label로)
  const civilNote = getNoteForSubjectLabel(data.subject.label);

  // 한국사 통합 (2026-05-24): 모든 한국사 → 한능검 콘텐츠 (자체 CBT stem 24개도 통합)
  // 다른 LIVE 과목 → /[examSlug]/[subjectSlug] subject landing으로
  // 단권화 있으면 → notes 직접 링크
  const href = isHistory
    ? historyRoutes.exam
    : isLive
      ? `/${encodeURIComponent(examSlug)}/${encodeURIComponent(data.subject.slug)}`
      : civilNote
        ? `/${encodeURIComponent(examSlug)}/${encodeURIComponent(data.subject.slug)}/notes`
        : null;

  const clickable = isHistory || isLive || Boolean(civilNote);
  const cardClass =
    "block rounded-2xl border p-5 transition-all " +
    (isHistory
      ? "border-[var(--gc-amber)] bg-gradient-to-br from-[#FFF7ED] to-white hover:shadow-md hover:scale-[1.01]"
      : clickable
        ? "border-[var(--gc-hairline)] bg-white hover:border-[var(--gc-amber)] hover:shadow-sm"
        : "border-dashed border-[var(--gc-hairline)] bg-white/60 text-[var(--gc-ink2)] cursor-default");

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)]">
          {data.subject.label}
        </h3>
        <div className="flex gap-1.5">
          {isHistory && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#B45309] text-white">
              🏛️ 한능검 무료
            </span>
          )}
          {!isHistory && civilNote && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#FED7AA] text-[#B45309]">
              📝 단권화
            </span>
          )}
          {!isHistory && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isLive ? "bg-[#CCFBF1] text-[#115E59]" : "bg-[#F3F4F6] text-[#6B7280]"
              }`}
            >
              {isLive ? "기출 LIVE" : "기출 준비중"}
            </span>
          )}
        </div>
      </div>

      {optional && (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--gc-ink2)]">
          선택 과목
        </p>
      )}

      <p className="mt-2 text-sm text-[var(--gc-ink2)]">{data.subject.description}</p>

      {isHistory && (
        <p className="mt-2 text-xs text-[#B45309] font-mono">
          1,900+ 기출 · 87 시대별 요약노트 · 자동 오답노트
        </p>
      )}

      {!isHistory && civilNote && (
        <p className="mt-2 text-xs text-[#B45309] font-mono">
          {civilNote.topics}단원 · {civilNote.keywords}키워드 · 빈출 100% 커버
        </p>
      )}

      {!isLive && !civilNote && !isHistory && data.subject.etaQuarter && (
        <p className="mt-3 text-xs font-mono text-[var(--gc-amber)]">
          출시: {data.subject.etaQuarter}
        </p>
      )}
    </>
  );

  return href ? (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  ) : (
    <div className={cardClass}>{inner}</div>
  );
}

// ============================================================
// Market info
// ============================================================

function MarketSection({ exam }: { exam: ExamTypeWithSubjects }) {
  if (!exam.marketSize) return null;
  const { applicants, openings, year, source } = exam.marketSize;

  return (
    <section className="mt-14 rounded-2xl border border-[var(--gc-hairline)] bg-white p-6 md:p-8">
      <h2 className="font-serif-kr text-xl md:text-2xl font-bold text-[var(--gc-ink)]">
        응시 정보
      </h2>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {applicants != null && (
          <div>
            <div className="font-mono text-xs uppercase text-[var(--gc-ink2)]">연 응시자</div>
            <div className="font-serif-kr text-2xl font-black text-[var(--gc-ink)]">
              {applicants.toLocaleString()}명
            </div>
          </div>
        )}
        {openings != null && (
          <div>
            <div className="font-mono text-xs uppercase text-[var(--gc-ink2)]">연 선발 인원</div>
            <div className="font-serif-kr text-2xl font-black text-[var(--gc-ink)]">
              {openings.toLocaleString()}명
            </div>
          </div>
        )}
        {applicants != null && openings != null && (
          <div>
            <div className="font-mono text-xs uppercase text-[var(--gc-ink2)]">경쟁률</div>
            <div className="font-serif-kr text-2xl font-black text-[var(--gc-ink)]">
              {(applicants / openings).toFixed(1)}:1
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-[var(--gc-ink2)]">
        {year ? `${year}년 ` : ""}{source ? `· ${source}` : ""} [실측]
      </p>
    </section>
  );
}

// ============================================================
// Schedule
// ============================================================

function ScheduleSection({ events }: { events: ExamScheduleEvent[] }) {
  return (
    <section className="mt-14">
      <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)] mb-6">
        2026 시험 일정
      </h2>
      <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gc-bg)]/60">
            <tr>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-[var(--gc-ink2)]">
                날짜
              </th>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-[var(--gc-ink2)]">
                구분
              </th>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-[var(--gc-ink2)]">
                시험
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const d = new Date(e.date + "T00:00:00Z");
              return (
                <tr key={e.date + e.label} className="border-t border-[var(--gc-hairline)]">
                  <td className="px-4 py-3 font-mono text-sm text-[var(--gc-ink)]">
                    {d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="rounded-full bg-[var(--gc-bg)] px-2 py-0.5 font-mono text-[var(--gc-ink2)]">
                      {e.type ?? "본시험"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--gc-ink)]">{e.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================
// FAQ
// ============================================================

function FaqSection({
  exam,
  certBadge,
}: {
  exam: ExamTypeWithSubjects;
  certBadge?: ResolvedSubjectRef;
}) {
  const isFuture = certBadge?.certAccepted?.[0]?.includes("2027");
  const grade = certBadge?.certAccepted?.[0] ?? "한능검";
  const isLocal = exam.id === "civil-9-local";
  const isSeoul = exam.slug === "9급-지방직-서울시";
  const isNational = exam.id === "civil-9-national";
  const isChildSeries = Boolean(exam.parentExamId);
  const electives = exam.subjects.selectable ?? [];
  const electiveLabels = electives
    .map((r) => r.subject.label)
    .filter(Boolean)
    .join("·");

  const faqs = [
    {
      q: `${exam.shortLabel} 한국사는 어떻게 대비하나요?`,
      a: certBadge
        ? `${exam.shortLabel} 한국사는 ${grade} 인증서로 대체됩니다. 기출노트의 한능검 1,900+ 기출과 87개 시대별 요약노트로 무료 학습 가능합니다. 한능검은 연 5회(2·5·8·10·11월) 시행되니 시험 시즌 전에 미리 합격 등급을 확보해두는 게 유리합니다.`
        : `${exam.shortLabel}의 한국사 학습은 한능검 콘텐츠로 진행 가능합니다.`,
    },
    ...(isChildSeries && electives.length > 0
      ? [
          {
            q: `${exam.shortLabel} 전공 과목은 무엇이고 부담은 어느 정도인가요?`,
            a: `${exam.shortLabel}의 전공 과목은 ${electiveLabels}입니다. 공통 3과목(국어·영어·한국사)에 더해 전공 ${electives.length}과목까지 총 5과목 학습. 한국사를 한능검으로 미리 빼면 실질 학습 부담은 국어·영어 + 전공 ${electives.length}과목. 전공 과목 중 단권화 노트가 완비된 과목은 빈출 100% 커버되므로 이를 중심으로 회독 잡으면 효율적.`,
          },
          {
            q: `${exam.shortLabel}와 다른 직렬의 차이는?`,
            a: `공통 3과목(국어·영어·한국사)은 모든 직렬 동일. 전공 ${electives.length}과목이 직렬마다 다르며, 합격 후 근무지·업무도 직렬에 따라 달라집니다. 한 번 합격 후 직렬 변경은 일반적으로 어려우며, 별도 인사이동·재시험을 거쳐야 합니다. 전공 적성·관심 분야가 직렬 선택의 핵심.`,
          },
        ]
      : []),
    {
      q: `${exam.shortLabel} 합격선은 어느 정도인가요?`,
      a: `9급 공무원 합격선은 직렬·연도별로 다르지만 일반적으로 평균 80점대 후반 ~ 90점대 초반에서 형성됩니다. 인기 직렬(일반행정·검찰사무·교정 등)은 합격선이 더 높고, 기술직군은 비교적 낮은 편입니다. 모든 과목 40점 미만은 과락(불합격) 처리되므로 약점 과목을 만들지 않는 게 중요합니다.`,
    },
    {
      q: `${exam.shortLabel} 평균 준비 기간은 얼마나 걸리나요?`,
      a: `초시생 기준 평균 12~18개월. 한국사 한능검을 미리 따두면 실제 시험 준비는 9~12개월로 단축 가능합니다. 전공 배경이 있는 직렬(회계학과 → 세무직, 법학과 → 검찰사무직)은 6~9개월도 가능. 직장인 병행은 18~24개월이 일반적입니다.`,
    },
    {
      q: "9급과 7급 공무원의 차이는?",
      a: "9급은 실무직, 7급은 중간관리직으로 출발. 7급은 PSAT(언어·자료·상황판단) + 헌법까지 시험 부담이 더 크고 경쟁률도 높습니다. 9급 합격 후 근속·승진으로 7급 이상에 오를 수 있어, 일반적으로 9급부터 도전하는 응시생이 많습니다. 9급 평균 합격 연령은 28세 전후.",
    },
    {
      q: "직렬은 어떻게 선택해야 하나요?",
      a: "본인 전공·적성·근무 희망 지역을 기준으로 선택. 회계학 전공이면 세무직, 법학과면 검찰사무직, 비전공자라면 일반행정직이 진입 부담이 적습니다. 위 '어떤 직렬을 골라야 할까' 섹션에서 직군별 분류를 확인하세요. 한 번 합격 후 직렬 변경은 어렵습니다.",
    },
    {
      q: `${exam.shortLabel} 합격 후 연봉·복지는?`,
      a: "9급 1호봉 본봉은 2026년 기준 약 200만 원대 (수당 포함 월 230~250만 원 추정). 연차에 따라 호봉 상승 + 가족수당·정근수당·명절수당 등 별도. 정년(60세) + 공무원연금 + 복지카드 + 의료비 지원 등 비금전 복지가 강점입니다.",
    },
    ...(isNational
      ? [
          {
            q: "국가직과 지방직의 차이는?",
            a: "국가직(인사혁신처 주관)은 전국 단위 발령 — 부처·세관·교정시설 등으로 배치. 지방직(시·도 주관)은 본인 응시 지역 안에서만 근무하므로 거주지 안정성이 높습니다. 국가직이 채용 인원·전국 인지도가 더 크고, 지방직은 지역 안정성 강점. 둘 다 시험과목·난이도는 거의 동일.",
          },
        ]
      : []),
    ...(isLocal || isSeoul
      ? [
          {
            q: `${exam.shortLabel} 응시 자격은?`,
            a: `해당 지자체의 거주 요건이 적용됩니다. 일반적으로 시험일 기준 본인 또는 주민등록상 가족이 해당 지역에 일정 기간(3년 이상 등) 거주한 이력이 필요. 자세한 응시자격은 매년 공고문 확인 필수.`,
          },
        ]
      : []),
    {
      q: "기출노트는 정말 무료인가요?",
      a: "네. 기출문제·요약노트·오답노트·학습세션은 모두 무료이며 회원가입 없이 바로 사용 가능합니다. 운영비는 페이지당 1~2개의 간단한 광고로 충당하며 학습 흐름을 끊지 않도록 배치했습니다.",
    },
    {
      q: "다른 과목 (국어/영어 등)은 언제 추가되나요?",
      a: "9급 공통 국어/영어는 2026년 하반기 추가 예정. 직렬별 전공 과목 (행정법·행정학·형법·세법·회계학 등 13과목)은 자동 단권화 노트로 이미 제공 중이며, 본문 직접 작성 노트도 단계적으로 확장합니다. 한국사는 한능검 인증으로 즉시 대비 가능.",
    },
    ...(isFuture
      ? [
          {
            q: "왜 지금 한능검부터 시작해야 하나요?",
            a: "2027년부터 9급 한국사 시험이 한능검으로 전면 통합됩니다. 시험 시즌 직전에 시작하는 것보다, 지금부터 천천히 합격 등급을 확보해두면 시험 부담이 1과목 줄어듭니다. 한능검은 평균 1~2개월 준비로 3급(60점+) 합격 가능.",
          },
        ]
      : []),
  ];

  return (
    <section className="mt-14">
      <h2 className="font-serif-kr text-2xl md:text-3xl font-bold text-[var(--gc-ink)] mb-6">
        자주 묻는 질문
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-[var(--gc-hairline)] bg-white p-5 open:bg-[var(--gc-bg)]/40"
          >
            <summary className="cursor-pointer font-bold text-[var(--gc-ink)] list-none flex items-center justify-between">
              <span>Q. {faq.q}</span>
              <span className="text-[var(--gc-amber)] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-[var(--gc-ink2)] leading-relaxed">A. {faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// SEO Prose
// ============================================================

function SeoProse({
  exam,
  certBadge,
}: {
  exam: ExamTypeWithSubjects;
  certBadge?: ResolvedSubjectRef;
}) {
  const isContainer = exam.isContainer;
  const isChildSeries = Boolean(exam.parentExamId);
  const electives = exam.subjects.selectable ?? [];
  const electiveLabels = electives.map((r) => r.subject.label).filter(Boolean).join("·");
  return (
    <section className="mt-16 prose prose-sm max-w-none text-[var(--gc-ink2)]">
      <h2 className="font-serif-kr text-2xl font-bold text-[var(--gc-ink)] not-prose mb-4">
        {exam.label} 학습 가이드
      </h2>
      <p>
        <strong>{exam.label}</strong>은(는) {exam.description}
      </p>

      {isContainer && (
        <>
          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            왜 {exam.shortLabel}인가
          </h3>
          <p>
            9급 공무원은 <strong>정년 60세 보장</strong>, 공무원연금, 의료비 지원, 복지카드, 휴직·육아휴직 보장 등
            민간 대기업과 비교해도 손색없는 복지를 갖춘 안정 직업입니다. 1호봉 본봉은 2026년 기준 약 200만 원대지만
            수당(가족수당·정근수당·명절수당·시간외수당 등) 포함 시 월 230~250만 원 수준. 연차 + 호봉 + 직급 승진에 따라
            꾸준히 상승하며, 평균 9급 1호봉 → 7급까지 약 7~10년이 소요됩니다.
          </p>
          <p>
            연 응시자 12만 명 이상으로 경쟁이 치열하지만, 시험 자체는 학원·인강 없이도 무료 학습 콘텐츠만으로
            합격 가능한 영역입니다. 핵심은 <strong>공통 3과목(국어·영어·한국사) + 직렬 전공 2과목</strong>의
            기출문제 반복 + 오답 분석 + 단권화 정리. 사교육비를 최소화해 준비할 수 있는 시험입니다.
          </p>

          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            시험 구조와 합격선
          </h3>
          <p>
            5과목 100문항(과목당 20문항) · 100분 시험. <strong>모든 과목 40점 미만은 과락(불합격)</strong> 처리되며,
            평균 점수와 가산점(자격증·취업지원대상자 등)을 합산해 직렬별 선발 인원만큼 합격. 인기 직렬(일반행정·검찰사무·교정)은
            평균 90점대 초반, 기술직군은 80점대 후반에서 합격선이 형성되는 경우가 많습니다. 약점 과목을 만들지 않는 것이
            가장 중요한 합격 전략입니다.
          </p>

          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            준비 기간과 학습 전략
          </h3>
          <p>
            초시생 평균 12~18개월, 전공 배경이 있으면 6~9개월, 직장인 병행은 18~24개월이 일반적입니다.
            <strong> 한국사를 한능검 합격으로 미리 따두면</strong> 실제 시험 준비는 4과목으로 줄어 합격이 빨라집니다 —
            2027년부터 9급 한국사가 한능검으로 전면 통합되므로 더더욱 미리 준비할 가치가 있습니다.
            기출노트의 한능검 콘텐츠(1,900+ 기출 · 87 시대별 요약노트 · 자동 오답노트)로 무료 학습 가능.
          </p>

          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            직군별 진로와 근무지
          </h3>
          <p>
            <strong>행정 직군</strong>(일반행정·교육행정·선거행정·통계·사회복지·직업상담)은 가장 진입 부담이 적고
            범용 진로. <strong>법무·교정 직군</strong>(검찰사무·교정·보호)은 형법·형사소송법 부담이 있지만
            업무 안정성·전문성이 강합니다. <strong>세무·재무 직군</strong>(세무·관세)은 세법·회계학 학습 필수.
            <strong> 기술 직군</strong>(건축·토목·전기·전산 등 12개)은 해당 자격증 가산점이 적용되어 비전공자
            진입이 어렵습니다. 합격 후에는 부처·세관·교정시설·시도 본청 등 직렬에 맞는 기관에서 근무합니다.
          </p>
        </>
      )}

      {isChildSeries && (
        <>
          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            {exam.shortLabel} 전공 과목 구성
          </h3>
          <p>
            {exam.shortLabel} 응시자는 공통 3과목(국어·영어·한국사) + 전공 {electives.length}과목,
            총 5과목을 풀게 됩니다.
            {electives.length > 0 && (
              <> 전공 과목은 <strong>{electiveLabels}</strong>입니다.</>
            )}{" "}
            한국사를 한능검 인증으로 미리 빼두면 실질 학습 부담은 국어·영어 + 전공 {electives.length}과목으로 줄어듭니다.
            전공 과목 중 단권화 노트가 완비된 과목은 빈출 100% 커버되므로 회독 중심 학습이 가능합니다.
          </p>

          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            {exam.shortLabel} 합격 전략
          </h3>
          <p>
            모든 과목 40점 미만은 과락. 직렬별 합격선은 평균 80점대 후반~90점대 초반에서 형성됩니다.
            약점 과목을 만들지 않는 것이 최우선이며, 공통 3과목 + 전공 2~5과목을 균형 있게 회독해야 합니다.
            추천 시간 배분은 <strong>공통 6 : 전공 4</strong> (전공이 5과목인 직렬은 5:5). 한국사는 한능검 합격
            등급을 빨리 확보해 전공 시간을 늘리는 게 합격 속도를 가르는 핵심 변수.
          </p>

          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            합격 후 업무와 진로
          </h3>
          <p>
            {exam.shortLabel} 합격자는 해당 직렬의 부처·청·기관에서 9급 행정사무관(또는 기술직)으로 근무 시작.
            정년 60세 + 공무원연금 + 의료비 지원 + 휴직·육아휴직 보장. 호봉 + 직급 승진으로 9급 → 7급까지
            평균 7~10년 소요. 본인 노력에 따라 6급·5급(사무관)까지 승진 가능하며, 전문성을 살려 특정 분야
            (감사·정책·예산 등)로 경력 발전도 가능합니다.
          </p>
        </>
      )}

      {certBadge && (
        <>
          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
            한국사 = 한능검 대체
          </h3>
          <p>
            {exam.shortLabel} 응시자는 한국사 시험 대신 <strong>{certBadge.certAccepted?.join(" 또는 ")}</strong> 인증서를
            제출합니다. 한능검은 연 5회(2월·5월·8월·10월·11월) 시행되며 평균 1~2개월 준비로 합격 등급(3급 60점+)
            도달 가능. 시험 일정에 맞춰 미리 합격 등급을 확보해두면 시험 시즌에 4과목만 집중 학습할 수 있습니다.
          </p>
        </>
      )}

      <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] not-prose mt-8 mb-3">
        기출노트 — 무료 학습 도구
      </h3>
      <p>
        기출노트는 회원가입 없이 바로 사용할 수 있는 무료 시험 학습 도구입니다. 한능검 1,900+ 기출문제와
        87개 시대별 요약노트, 자동 오답노트, 맞춤 학습 세션을 제공합니다.
        다른 사이트와 달리 <strong>문제를 풀고 정답 확인 시 관련 요약노트의 정확한 부분이 자동 연결</strong>되어
        학습 흐름이 끊기지 않습니다. 운영비는 페이지당 1~2개의 간결한 광고로 충당합니다.
      </p>
      <p className="text-xs text-[var(--gc-ink2)]/70 mt-6">
        키워드: {exam.seo.keywords.slice(0, 8).join(", ")}
      </p>
    </section>
  );
}
