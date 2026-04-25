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

interface PageProps {
  params: Promise<{ examSlug: string }>;
}

export function generateStaticParams() {
  return getAllExamTypes().map((e) => ({ examSlug: e.slug }));
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

  return (
    <main className="bg-[var(--gc-bg)] min-h-screen">
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
          <JobSeriesSection parentId={exam.id} />
        ) : (
          <SubjectsSection
            required={exam.subjects.required}
            selectable={exam.subjects.selectable}
            historyRoutes={HISTORY_ROUTES}
            examSlug={exam.slug}
          />
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

  // 한국사 (한능검 콘텐츠 호환) → 한능검 legacy로
  // 다른 LIVE 과목 → /[examSlug]/[subjectSlug] subject landing으로
  const href =
    isLive && isHistory
      ? historyRoutes.exam
      : isLive
        ? `/${encodeURIComponent(examSlug)}/${encodeURIComponent(data.subject.slug)}`
        : null;

  const cardClass =
    "block rounded-2xl border p-5 transition-all " +
    (isLive
      ? "border-[var(--gc-hairline)] bg-white hover:border-[var(--gc-amber)] hover:shadow-sm"
      : "border-dashed border-[var(--gc-hairline)] bg-white/60 text-[var(--gc-ink2)] cursor-default");

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)]">
          {data.subject.label}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isLive ? "bg-[#CCFBF1] text-[#115E59]" : "bg-[#FED7AA] text-[var(--gc-amber)]"
          }`}
        >
          {isLive ? "LIVE" : "준비중"}
        </span>
      </div>

      {optional && (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--gc-ink2)]">
          선택 과목
        </p>
      )}

      <p className="mt-2 text-sm text-[var(--gc-ink2)]">{data.subject.description}</p>

      {!isLive && data.subject.etaQuarter && (
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

  const faqs = [
    {
      q: `${exam.shortLabel} 한국사는 어떻게 대비하나요?`,
      a: certBadge
        ? `${exam.shortLabel} 한국사는 ${grade} 인증서로 대체됩니다. 기출노트의 한능검 기출 + 요약노트로 무료 학습 가능합니다.`
        : `${exam.shortLabel}의 한국사 학습은 한능검 콘텐츠로 진행 가능합니다.`,
    },
    {
      q: "기출노트는 정말 무료인가요?",
      a: "네. 모든 기출문제·요약노트·오답노트·학습세션은 무료입니다. 광고는 페이지당 1~2개로 절제했고, 회원가입 없이 바로 풀 수 있습니다.",
    },
    {
      q: "다른 과목 (국어/영어 등)은 언제 추가되나요?",
      a: "9급 공통 국어/영어는 2026년 하반기 추가 예정. 직렬별 전공 과목 (행정법/형법 등)은 단계적 출시. 한국사는 한능검 인증으로 즉시 대비 가능.",
    },
    ...(isFuture
      ? [
          {
            q: "왜 지금 한능검부터 시작해야 하나요?",
            a: "2027년부터 공무원 한국사 시험이 한능검으로 통합됩니다. 시험 시즌 직전에 시작하는 것보다, 지금부터 천천히 합격 등급을 확보해두면 시험 부담이 1과목 줄어듭니다.",
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
  return (
    <section className="mt-16 prose prose-sm max-w-none text-[var(--gc-ink2)]">
      <h2 className="font-serif-kr text-2xl font-bold text-[var(--gc-ink)] not-prose mb-4">
        {exam.label} 학습 가이드
      </h2>
      <p>
        <strong>{exam.label}</strong>은(는) {exam.description}
      </p>
      {certBadge && (
        <p>
          {exam.shortLabel} 응시자는 한국사 시험 대신 <strong>{certBadge.certAccepted?.join(" 또는 ")}</strong> 인증서를
          제출합니다. 한능검은 연 5회(2월·5월·8월·10월·11월) 시행되며, 시험 일정에 맞춰 미리 합격 등급을 확보해두는 것이 유리합니다.
        </p>
      )}
      <p>
        기출노트는 <strong>광고 없이 무료로 운영</strong>되는 시험 학습 도구입니다. 한능검 1,900+ 기출문제와
        87개 시대별 요약노트, 자동 오답노트, 맞춤 학습 세션을 제공합니다.
        다른 사이트와 달리 <strong>문제를 풀고 정답 확인 시 관련 요약노트의 정확한 부분이 자동 연결</strong>되어
        학습이 끊기지 않습니다.
      </p>
      <p className="text-xs text-[var(--gc-ink2)]/70 mt-6">
        키워드: {exam.seo.keywords.slice(0, 8).join(", ")}
      </p>
    </section>
  );
}
