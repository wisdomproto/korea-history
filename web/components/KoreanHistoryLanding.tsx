// Component (formerly app/page.tsx). Rendered from /한능검 via dynamic [examSlug] route.
// Original metadata stripped — owner page sets it via generateMetadata.
import Link from "next/link";
import { getAllExams, getAllKeywords } from "@/lib/data";
import type { ExamFile } from "@/lib/types";
import AdSlot from "@/components/AdSlot";

// ── Design tokens (match globals.css :root vars) ────────────────────────
const T = {
  bg:        "var(--gc-bg)",
  bgDeep:    "var(--gc-bg-deep)",
  paper:     "var(--gc-paper)",
  ink:       "var(--gc-ink)",
  ink2:      "var(--gc-ink2)",
  subtle:    "var(--gc-subtle)",
  hairline:  "var(--gc-hairline)",
  amber:     "var(--gc-amber)",
  amberSoft: "var(--gc-amber-soft)",
  teal:      "var(--gc-teal)",
  tealSoft:  "var(--gc-teal-soft)",
  rose:      "var(--gc-rose)",
};
const FONT_SERIF = "var(--gc-font-serif)";
const FONT_SANS  = "var(--gc-font-sans)";
const FONT_MONO  = "var(--gc-font-mono)";

// ── Minimal SVG icon set (no emoji) ──────────────────────────────────────
function Icon({
  name,
  size = 18,
  color = "currentColor",
}: {
  name: "book" | "note" | "link" | "flag" | "check" | "arrow" | "time";
  size?: number;
  color?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5Z" />
          <path d="M4 18h14" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M5 3h10l4 4v14H5z" />
          <path d="M15 3v4h4" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M5 21V4h10l-1 4h5l-2 6h-5l1 4H5z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4 10-10" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 5 7 7-7 7" />
        </svg>
      );
    case "time":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}

// ────────────────────────────────────────────────────────────────────────
//  HERO
// ────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden px-5 sm:px-6 md:px-8 pt-14 pb-12 md:pt-20 md:pb-[60px]">
      <div
        className="mx-auto grid items-center grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 md:gap-[60px]"
        style={{ maxWidth: 1280 }}
      >
        <div>
          <div
            className="inline-flex items-center text-[15px] sm:text-[18px] md:text-[22px]"
            style={{
              gap: 14,
              padding: "12px 24px",
              background: T.paper,
              border: `1px solid ${T.hairline}`,
              borderRadius: 999,
              fontFamily: FONT_MONO,
              color: T.amber,
              letterSpacing: "0.16em",
              fontWeight: 800,
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: T.amber,
              }}
            />
            기출노트 · 한능검 · 심화
          </div>

          <h1
            className="text-[40px] sm:text-[60px] md:text-[84px]"
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 900,
              color: T.ink,
              letterSpacing: "-0.045em",
              lineHeight: 1.02,
              margin: "0 0 20px",
            }}
          >
            한능검 기출문제와<br />
            요약노트,<br />
            <span style={{ color: T.amber }}>한 번에.</span>
          </h1>

          <p
            className="text-[16px] sm:text-[19px]"
            style={{
              fontFamily: FONT_SANS,
              color: T.subtle,
              lineHeight: 1.6,
              maxWidth: 520,
              margin: "0 0 36px",
              fontWeight: 500,
            }}
          >
            <b style={{ color: T.ink }}>기출노트</b>는 한국사능력검정시험 기출문제 1,900+ 문항과 시대별 요약노트 87편을 무료로 제공합니다.<br />
            틀린 문제는 관련 단원으로 바로 연결. {" "}
            <b style={{ color: T.ink }}>평생 무료.</b>
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/exam"
              className="no-underline inline-flex items-center"
              style={{
                gap: 10,
                padding: "16px 28px",
                background: T.ink,
                color: T.bg,
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 700,
                boxShadow: "0 14px 34px rgba(31,26,20,0.20)",
              }}
            >
              지금 문제 풀기
              <Icon name="arrow" size={16} color={T.bg} />
            </Link>
            <Link
              href="/notes"
              className="no-underline inline-flex items-center"
              style={{
                gap: 10,
                padding: "16px 28px",
                background: "transparent",
                color: T.ink,
                border: `1.5px solid ${T.hairline}`,
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              요약노트 둘러보기
            </Link>
          </div>

          <div
            className="flex flex-wrap"
            style={{
              marginTop: 36,
              gap: 28,
              fontFamily: FONT_SANS,
              fontSize: 13,
              color: T.subtle,
              fontWeight: 600,
            }}
          >
            {["회원가입 없이", "결제 없이", "평생 무료"].map((t) => (
              <div
                key={t}
                className="flex items-center"
                style={{ gap: 7 }}
              >
                <Icon name="check" size={14} color={T.teal} />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual — Q card + Note card with connection */}
        <div
          className="hidden md:block relative"
          style={{ height: 560 }}
        >
          <HeroCollage />
        </div>
      </div>
    </section>
  );
}

function HeroCollage() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Ambient era tabs */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: -20,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          opacity: 0.5,
        }}
      >
        {["선사", "삼국", "통일신라", "고려", "조선", "근대", "현대"].map((e, i) => (
          <div
            key={e}
            style={{
              padding: "6px 14px",
              background: T.paper,
              border: `1px solid ${T.hairline}`,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: FONT_MONO,
              color: T.subtle,
              fontWeight: 700,
              transform: `translateX(${i * 4}px)`,
            }}
          >
            {e}
          </div>
        ))}
      </div>

      {/* Q card */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          width: 360,
          background: T.paper,
          borderRadius: 18,
          padding: 22,
          border: `1px solid ${T.hairline}`,
          boxShadow: "0 30px 80px rgba(20,15,10,0.14)",
          transform: "rotate(-2deg)",
        }}
      >
        <div className="flex items-baseline" style={{ gap: 10, marginBottom: 10 }}>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 26,
              fontWeight: 900,
              color: T.amber,
              letterSpacing: "-0.03em",
            }}
          >
            Q23
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: T.subtle,
              letterSpacing: "0.08em",
            }}
          >
            제77회 · 조선 전기
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: T.amberSoft,
              color: T.amber,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: FONT_MONO,
            }}
          >
            3점
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 15,
            fontWeight: 700,
            color: T.ink,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          (가) 왕에 대한 설명으로 옳은 것은?
        </div>
        <div
          style={{
            background: T.amberSoft,
            borderLeft: `4px solid ${T.amber}`,
            borderRadius: 8,
            padding: "12px 14px",
            fontFamily: FONT_SERIF,
            fontSize: 13,
            lineHeight: 1.7,
            color: T.ink2,
          }}
        >
          …새로{" "}
          <b
            style={{
              background: "#FEF08A",
              padding: "1px 5px",
              borderRadius: 3,
              color: T.ink,
            }}
          >
            스물여덟 자
          </b>
          를 만드니 하였다.
        </div>
        <div className="flex" style={{ marginTop: 12, gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 28,
                background: n === 1 ? T.tealSoft : "transparent",
                border: `1.5px solid ${n === 1 ? T.teal : T.hairline}`,
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: n === 1 ? 800 : 500,
                color: n === 1 ? T.teal : T.subtle,
                fontFamily: FONT_MONO,
              }}
            >
              {n === 1 ? "✓" : n}
            </div>
          ))}
        </div>
      </div>

      {/* Connection curve */}
      <svg
        style={{
          position: "absolute",
          top: 235,
          left: 310,
          width: 160,
          height: 120,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient id="heroG" x1="0" x2="1">
            <stop offset="0%" stopColor={T.amber} />
            <stop offset="100%" stopColor={T.teal} />
          </linearGradient>
        </defs>
        <path
          d="M 0 20 C 80 -10, 80 100, 160 80"
          stroke="url(#heroG)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <circle cx={0} cy={20} r={5} fill={T.amber} />
        <circle cx={160} cy={80} r={5} fill={T.teal} />
      </svg>

      {/* Note card */}
      <div
        style={{
          position: "absolute",
          top: 260,
          right: -10,
          width: 380,
          background: T.paper,
          borderRadius: 18,
          padding: 22,
          border: `1px solid ${T.hairline}`,
          boxShadow: "0 30px 80px rgba(20,15,10,0.14)",
          transform: "rotate(3deg)",
        }}
      >
        <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: T.teal,
              color: T.paper,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_SERIF,
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            노
          </div>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 18,
              fontWeight: 800,
              color: T.ink,
              letterSpacing: "-0.02em",
            }}
          >
            세종의 업적
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{ fontFamily: FONT_MONO, fontSize: 10, color: T.subtle }}
          >
            5-03
          </div>
        </div>
        <div
          style={{
            padding: "10px 12px",
            background: T.tealSoft,
            border: `2px solid ${T.teal}`,
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 14,
              fontWeight: 800,
              color: T.ink,
            }}
          >
            · 훈민정음 창제
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 11,
              color: T.subtle,
              marginTop: 2,
            }}
          >
            28자 · 1443년 (세종 25년) · 1446년 반포
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 11,
            color: T.subtle,
            lineHeight: 1.8,
            paddingLeft: 4,
          }}
        >
          · 4군 6진 개척 · 최윤덕·김종서<br />
          · 편찬 사업 · 농사직설, 칠정산<br />
          · 과학 기술 · 측우기, 앙부일구
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  STATS BAND
// ────────────────────────────────────────────────────────────────────────
function StatsBand({
  totalQuestions,
  examCount,
  noteCount,
}: {
  totalQuestions: number;
  examCount: number;
  noteCount: number;
}) {
  const stats = [
    { n: `${totalQuestions.toLocaleString()}+`, l: "기출문항", sub: "심화 전 회차" },
    { n: `${examCount}`,  l: "회차",     sub: "제40 – 제77회" },
    { n: `${noteCount}`,  l: "요약노트", sub: "7개 시대 분류" },
    { n: "₩0",            l: "평생 무료", sub: "결제·회원가입 없음" },
  ];
  return (
    <section
      className="px-5 sm:px-6 md:px-8 py-10 md:py-[60px]"
      style={{
        background: T.bgDeep,
        borderTop: `1px solid ${T.hairline}`,
        borderBottom: `1px solid ${T.hairline}`,
      }}
    >
      <div
        className="mx-auto grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 md:gap-10"
        style={{ maxWidth: 1280 }}
      >
        {stats.map((s) => {
          return (
          <div key={s.l}>
            <div
              className="text-[40px] md:text-[72px]"
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 900,
                color: T.ink,
                letterSpacing: "-0.05em",
                lineHeight: 1,
              }}
            >
              {s.n}
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: FONT_SANS,
                fontSize: 15,
                fontWeight: 700,
                color: T.ink,
              }}
            >
              {s.l}
            </div>
            <div
              style={{
                marginTop: 2,
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: T.subtle,
                letterSpacing: "0.08em",
              }}
            >
              {s.sub}
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  FEATURE GRID
// ────────────────────────────────────────────────────────────────────────
function FeatureGrid() {
  const feats = [
    {
      n: "01",
      t: "모든 기출, 검색까지",
      d: "제40회–제77회 1,900+ 문항. 시대·주제·키워드로 즉시 필터.",
      icon: "book" as const,
      tone: T.amber,
    },
    {
      n: "02",
      t: "시대별 요약노트",
      d: "7개 시대 87개 단원. 핵심만 압축한 정리노트로 빠르게 복습.",
      icon: "note" as const,
      tone: T.teal,
    },
    {
      n: "03",
      t: "문제↔노트 바로 연결",
      d: "틀린 문제의 키워드와 동일한 단원을 한 탭에 펼쳐 보여줘요.",
      icon: "link" as const,
      tone: T.rose,
    },
    {
      n: "04",
      t: "오답노트, 자동으로",
      d: "틀린 문제는 자동 저장. 회차별·시대별로 약점만 다시 풀기.",
      icon: "flag" as const,
      tone: T.amber,
    },
  ];
  return (
    <section className="px-5 sm:px-6 md:px-8 pt-16 pb-10 md:pt-[100px] md:pb-[60px]">
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        <div
          className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-[60px] mb-10 md:mb-[56px]"
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              color: T.amber,
              letterSpacing: "0.25em",
              fontWeight: 700,
            }}
          >
            W H Y &nbsp; G C N O T E
          </div>
          <h2
            className="text-[36px] md:text-[56px]"
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 900,
              color: T.ink,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              margin: 0,
              flex: 1,
            }}
          >
            합격까지, 필요한 건{" "}
            <span style={{ color: T.amber }}>네 가지</span>.
          </h2>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 overflow-hidden"
          style={{
            gap: 1,
            background: T.hairline,
            border: `1px solid ${T.hairline}`,
            borderRadius: 20,
          }}
        >
          {feats.map((f) => (
            <div
              key={f.n}
              className="p-7 md:p-10"
              style={{ background: T.paper, minHeight: 200 }}
            >
              <div
                className="flex items-center"
                style={{ gap: 14, marginBottom: 22 }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 11,
                    background: f.tone,
                    color: T.paper,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={f.icon} size={22} color={T.paper} />
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: T.subtle,
                    letterSpacing: "0.3em",
                    fontWeight: 700,
                  }}
                >
                  {f.n}
                </div>
              </div>
              <div
                className="text-[22px] md:text-[30px]"
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 800,
                  color: T.ink,
                  letterSpacing: "-0.025em",
                  marginBottom: 12,
                  lineHeight: 1.15,
                }}
              >
                {f.t}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 15,
                  color: T.subtle,
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                {f.d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  EXAM PREVIEW
// ────────────────────────────────────────────────────────────────────────
function ExamPreview() {
  return (
    <section className="px-5 sm:px-6 md:px-8 py-14 md:py-20">
      <div
        className="mx-auto grid items-center grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-[72px]"
        style={{ maxWidth: 1280 }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: T.amber,
              letterSpacing: "0.25em",
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            0 1 &nbsp; 기 출 문 제
          </div>
          <h3
            className="text-[32px] md:text-[48px]"
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 900,
              color: T.ink,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              margin: "0 0 20px",
            }}
          >
            실제 시험장처럼,<br />한 문제씩.
          </h3>
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 17,
              color: T.subtle,
              lineHeight: 1.65,
              marginBottom: 28,
              fontWeight: 500,
            }}
          >
            회차를 골라{" "}
            <b style={{ color: T.ink }}>50문항을 순서대로</b> 풀거나,
            시대·주제별로 랜덤 출제해서 약점만 집중 공략하세요. 타이머,
            진행률, 즉각 피드백까지.
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontFamily: FONT_SANS,
              fontSize: 14,
              color: T.ink2,
              lineHeight: 2.1,
            }}
          >
            {[
              "회차별 시험 세션 · 실제 배치 그대로",
              "맞춤형 학습 · 시대·유형 선택",
              "바로 해설 모드 · 노트 링크",
              "오답노트 자동 저장 · 복습 세션",
            ].map((i) => (
              <li
                key={i}
                className="flex items-center"
                style={{ gap: 10 }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    background: T.amber,
                  }}
                />
                {i}
              </li>
            ))}
          </ul>
        </div>

        <BrowserFrame>
          <ExamMock />
        </BrowserFrame>
      </div>
    </section>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: T.paper,
        borderRadius: 14,
        border: `1px solid ${T.hairline}`,
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(20,15,10,0.14)",
      }}
    >
      <div
        className="flex items-center"
        style={{
          height: 38,
          background: T.bgDeep,
          borderBottom: `1px solid ${T.hairline}`,
          padding: "0 14px",
          gap: 8,
        }}
      >
        {["#E87A6E", "#F5C242", "#8AB07C"].map((c) => (
          <div
            key={c}
            style={{ width: 11, height: 11, borderRadius: 6, background: c }}
          />
        ))}
        <div style={{ flex: 1 }} />
        <div
          style={{
            padding: "4px 14px",
            background: T.paper,
            border: `1px solid ${T.hairline}`,
            borderRadius: 999,
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: T.subtle,
          }}
        >
          gcnote.co.kr/exam/77
        </div>
        <div style={{ flex: 1 }} />
      </div>
      {children}
    </div>
  );
}

function ExamMock() {
  return (
    <div className="p-4 sm:p-6 md:px-7 md:py-6" style={{ background: T.bg }}>
      {/* Header bar */}
      <div
        className="flex items-center"
        style={{ gap: 14, marginBottom: 18 }}
      >
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 17,
            fontWeight: 800,
            color: T.ink,
          }}
        >
          제77회 · 심화
        </div>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: T.hairline,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "46%",
              height: "100%",
              borderRadius: 3,
              background: T.amber,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: T.ink,
            fontWeight: 700,
          }}
        >
          23 / 50
        </div>
        <div
          className="flex items-center"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: T.subtle,
            gap: 5,
          }}
        >
          <Icon name="time" size={13} />
          47:12
        </div>
      </div>

      {/* Question */}
      <div
        style={{
          background: T.paper,
          border: `1px solid ${T.hairline}`,
          borderRadius: 14,
          padding: 22,
        }}
      >
        <div
          className="flex items-baseline"
          style={{ gap: 10, marginBottom: 14 }}
        >
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 28,
              fontWeight: 900,
              color: T.amber,
              letterSpacing: "-0.03em",
            }}
          >
            Q23
          </div>
          <div
            style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.subtle }}
          >
            조선 전기 · 3점
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 17,
            color: T.ink,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          (가) 왕에 대한 설명으로 옳은 것은?
        </div>
        <div
          style={{
            background: T.amberSoft,
            borderLeft: `4px solid ${T.amber}`,
            borderRadius: 9,
            padding: "14px 16px",
            fontFamily: FONT_SERIF,
            fontSize: 14,
            color: T.ink2,
            lineHeight: 1.75,
            marginBottom: 16,
          }}
        >
          왕이 이르기를, &ldquo;우리나라의 말이 중국과 달라 한자와는 서로 통하지 아니하므로…
          새로 스물여덟 자를 만드니&rdquo; 하였다.
        </div>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {[
            { n: 1, t: "훈민정음을 창제하여 반포하였다.", ok: true },
            { n: 2, t: "이성계를 도와 조선을 건국하였다." },
            { n: 3, t: "경국대전을 완성하여 반포하였다." },
            { n: 4, t: "균역법을 실시해 군역의 부담을 줄였다." },
          ].map((c) => (
            <div
              key={c.n}
              className="flex items-center"
              style={{
                gap: 12,
                padding: "11px 14px",
                border: `1.5px solid ${c.ok ? T.teal : T.hairline}`,
                background: c.ok ? T.tealSoft : T.paper,
                borderRadius: 10,
                fontFamily: FONT_SANS,
                fontSize: 13,
                fontWeight: c.ok ? 700 : 500,
                color: c.ok ? T.teal : T.ink2,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: c.ok ? T.teal : "transparent",
                  border: `1.5px solid ${c.ok ? T.teal : T.hairline}`,
                  color: T.paper,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: FONT_MONO,
                }}
              >
                {c.ok ? "✓" : c.n}
              </span>
              {c.t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  NOTES PREVIEW
// ────────────────────────────────────────────────────────────────────────
function NotesPreview() {
  const eras = [
    { kr: "선사 · 고조선",   en: "PREHISTORIC",    count: 13, color: T.teal },
    { kr: "삼국 시대",       en: "THREE KINGDOMS", count: 11, color: "#8B6F2A" },
    { kr: "통일신라 · 발해", en: "UNIFIED SILLA",  count: 20, color: "#5A4A8C" },
    { kr: "고려",            en: "GORYEO",         count: 17, color: T.amber },
    { kr: "조선",            en: "JOSEON",         count: 12, color: T.rose },
    { kr: "근대",            en: "MODERN",         count: 16, color: "#3A6A7A" },
    { kr: "현대",            en: "CONTEMPORARY",   count: 10, color: T.ink },
  ];
  return (
    <section
      className="px-5 sm:px-6 md:px-8 py-14 md:py-20"
      style={{
        background: T.bgDeep,
        borderTop: `1px solid ${T.hairline}`,
        borderBottom: `1px solid ${T.hairline}`,
      }}
    >
      <div
        className="mx-auto grid items-center grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-[72px]"
        style={{ maxWidth: 1280 }}
      >
        <div
          style={{
            background: T.paper,
            borderRadius: 18,
            border: `1px solid ${T.hairline}`,
            padding: 24,
            boxShadow: "0 24px 60px rgba(20,15,10,0.10)",
          }}
        >
          <div
            className="flex items-center"
            style={{ marginBottom: 14, gap: 12 }}
          >
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontSize: 18,
                fontWeight: 800,
                color: T.ink,
                letterSpacing: "-0.02em",
              }}
            >
              시대별 요약노트
            </div>
            <div style={{ flex: 1 }} />
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: T.subtle,
                letterSpacing: "0.18em",
                fontWeight: 700,
              }}
            >
              7 시대 · 99 단원
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {eras.map((e) => (
              <div
                key={e.kr}
                className="flex items-center"
                style={{
                  gap: 16,
                  padding: "14px 18px",
                  background: T.bg,
                  border: `1px solid ${T.hairline}`,
                  borderRadius: 11,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 36,
                    borderRadius: 2,
                    background: e.color,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      color: T.subtle,
                      letterSpacing: "0.2em",
                      fontWeight: 700,
                    }}
                  >
                    {e.en}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SERIF,
                      fontSize: 19,
                      fontWeight: 700,
                      color: T.ink,
                      letterSpacing: "-0.02em",
                      marginTop: 2,
                    }}
                  >
                    {e.kr}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: FONT_SERIF,
                    fontSize: 26,
                    fontWeight: 800,
                    color: e.color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {e.count}
                </div>
                <div
                  style={{ fontSize: 10, color: T.subtle, fontWeight: 700 }}
                >
                  단원
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: T.teal,
              letterSpacing: "0.25em",
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            0 2 &nbsp; 요 약 노 트
          </div>
          <h3
            className="text-[32px] md:text-[48px]"
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 900,
              color: T.ink,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              margin: "0 0 20px",
            }}
          >
            선사부터 현대까지,<br />한 권의 노트.
          </h3>
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 17,
              color: T.subtle,
              lineHeight: 1.65,
              marginBottom: 28,
              fontWeight: 500,
            }}
          >
            7개 시대 87개 단원으로 나뉜{" "}
            <b style={{ color: T.ink }}>압축 정리노트</b>. 시험 2주 전
            복습용으로도, 단원별 개념 잡기용으로도.
          </p>
          <Link
            href="/notes"
            className="no-underline inline-flex items-center"
            style={{
              padding: "14px 24px",
              background: T.ink,
              color: T.bg,
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 700,
              gap: 10,
            }}
          >
            요약노트 보기
            <Icon name="arrow" size={14} color={T.bg} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  LINKED PREVIEW
// ────────────────────────────────────────────────────────────────────────
function LinkedPreview() {
  return (
    <section className="px-5 sm:px-6 md:px-8 py-16 md:py-[100px]">
      <div
        className="mx-auto text-center"
        style={{ maxWidth: 1280 }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: T.rose,
            letterSpacing: "0.25em",
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          0 3 &nbsp; 연 결
        </div>
        <h3
          className="text-[36px] md:text-[56px]"
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 900,
            color: T.ink,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            margin: "0 auto 20px",
            maxWidth: 900,
          }}
        >
          틀린 문제, 그 부분만{" "}
          <span style={{ color: T.rose }}>딱 짚어 연결.</span>
        </h3>
        <p
          style={{
            fontFamily: FONT_SANS,
            fontSize: 18,
            color: T.subtle,
            lineHeight: 1.6,
            margin: "0 auto 48px",
            maxWidth: 640,
            fontWeight: 500,
          }}
        >
          문제의 핵심 키워드 → 요약노트의 같은 단원으로 정확히 매칭. 한 번에
          약점만 복습.
        </p>
        <div
          className="mx-auto grid items-center grid-cols-1 md:grid-cols-[1fr_80px_1fr] p-5 md:p-8 gap-5"
          style={{
            position: "relative",
            background: T.bgDeep,
            borderRadius: 20,
            border: `1px solid ${T.hairline}`,
            maxWidth: 1100,
          }}
        >
          <div
            style={{
              background: T.paper,
              borderRadius: 12,
              padding: 18,
              border: `1px solid ${T.hairline}`,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: T.subtle,
                letterSpacing: "0.15em",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Q23 · 제77회
            </div>
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontSize: 16,
                color: T.ink,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              …새로 스물여덟 자를 만드니
            </div>
            <div
              className="inline-flex items-center"
              style={{
                gap: 8,
                padding: "8px 14px",
                background: T.paper,
                border: `2px solid ${T.amber}`,
                borderRadius: 10,
                fontFamily: FONT_SERIF,
                fontSize: 15,
                fontWeight: 800,
                color: T.ink,
              }}
            >
              <span style={{ color: T.amber, fontWeight: 800 }}>✓</span>
              훈민정음 창제
            </div>
          </div>

          <div className="relative flex items-center justify-center my-2 md:my-0">
            <svg
              viewBox="0 0 80 80"
              style={{ overflow: "visible" }}
              className="rotate-90 md:rotate-0"
              width={80}
              height={80}
            >
              <defs>
                <linearGradient id="lpG" x1="0" x2="1">
                  <stop offset="0%" stopColor={T.amber} />
                  <stop offset="100%" stopColor={T.teal} />
                </linearGradient>
              </defs>
              <path
                d="M 0 40 Q 40 0 80 40"
                stroke="url(#lpG)"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
              <circle cx={0} cy={40} r={5} fill={T.amber} />
              <circle cx={80} cy={40} r={5} fill={T.teal} />
            </svg>
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                padding: "4px 12px",
                background: T.ink,
                color: T.paper,
                borderRadius: 999,
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.2em",
              }}
            >
              MATCH
            </div>
          </div>

          <div
            style={{
              background: T.paper,
              borderRadius: 12,
              padding: 18,
              border: `1px solid ${T.hairline}`,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: T.subtle,
                letterSpacing: "0.15em",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              조선 · 5-03
            </div>
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontSize: 19,
                fontWeight: 800,
                color: T.ink,
                letterSpacing: "-0.02em",
                marginBottom: 10,
              }}
            >
              세종의 업적
            </div>
            <div
              style={{
                padding: "10px 12px",
                background: T.tealSoft,
                border: `2px solid ${T.teal}`,
                borderRadius: 10,
                fontFamily: FONT_SERIF,
                fontSize: 14,
                color: T.ink,
                fontWeight: 700,
              }}
            >
              · 훈민정음 창제{" "}
              <span
                style={{ fontWeight: 500, color: T.subtle, fontSize: 12 }}
              >
                — 28자, 1443
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  LATEST EXAMS + KEYWORDS (preserved from previous landing)
// ────────────────────────────────────────────────────────────────────────
function LatestExamsBand({
  latestExams,
  topKeywords,
}: {
  latestExams: ExamFile[];
  topKeywords: Array<{ keyword: string; questionIds: number[] }>;
}) {
  return (
    <section className="px-5 sm:px-6 md:px-8 py-14 md:py-[100px]" style={{ background: T.bg }}>
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-[32px]">
          <div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: T.amber,
                letterSpacing: "0.25em",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              0 4 &nbsp; 최 신 기 출
            </div>
            <h3
              className="text-[28px] md:text-[40px]"
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 900,
                color: T.ink,
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                margin: 0,
              }}
            >
              바로 풀 수 있는 회차.
            </h3>
          </div>
          <Link
            href="/exam"
            className="no-underline inline-flex items-center"
            style={{
              gap: 8,
              fontFamily: FONT_SANS,
              fontSize: 14,
              fontWeight: 700,
              color: T.ink,
            }}
          >
            전체보기
            <Icon name="arrow" size={14} color={T.ink} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {latestExams.map(({ exam }) => {
            const isAdvanced = exam.examType === "advanced";
            return (
              <Link
                key={exam.id}
                href={`/exam/${exam.examNumber}`}
                className="no-underline"
                style={{
                  background: T.paper,
                  border: `1px solid ${T.hairline}`,
                  borderRadius: 16,
                  padding: 20,
                  display: "block",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  className="inline-block"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    padding: "3px 10px",
                    borderRadius: 999,
                    marginBottom: 12,
                    background: isAdvanced ? T.tealSoft : T.amberSoft,
                    color: isAdvanced ? T.teal : T.amber,
                  }}
                >
                  {isAdvanced ? "심화" : "기본"}
                </span>
                <p
                  style={{
                    fontFamily: FONT_SERIF,
                    fontSize: 28,
                    fontWeight: 900,
                    color: T.ink,
                    letterSpacing: "-0.03em",
                    margin: "0 0 4px",
                  }}
                >
                  제{exam.examNumber}회
                </p>
                <p
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: T.subtle,
                    margin: "0 0 14px",
                    letterSpacing: "0.05em",
                  }}
                >
                  {exam.totalQuestions}문항 · 70분
                </p>
                <div
                  className="flex items-center justify-center"
                  style={{
                    padding: "10px",
                    borderRadius: 10,
                    background: T.ink,
                    color: T.bg,
                    fontFamily: FONT_SANS,
                    fontSize: 13,
                    fontWeight: 700,
                    gap: 6,
                  }}
                >
                  풀기 시작
                  <Icon name="arrow" size={12} color={T.bg} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Keywords */}
        <div style={{ marginTop: 56 }}>
          <div
            className="flex items-end justify-between flex-wrap gap-4"
            style={{ marginBottom: 24 }}
          >
            <h3
              className="text-[22px] md:text-[28px]"
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 800,
                color: T.ink,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              인기 키워드
            </h3>
            <Link
              href="/study/keyword"
              className="no-underline"
              style={{
                fontFamily: FONT_SANS,
                fontSize: 13,
                fontWeight: 700,
                color: T.subtle,
              }}
            >
              전체보기 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {topKeywords.map(({ keyword, questionIds }) => (
              <Link
                key={keyword}
                href="/study/keyword"
                className="inline-flex items-center no-underline"
                style={{
                  gap: 8,
                  padding: "9px 16px",
                  borderRadius: 999,
                  background: T.paper,
                  border: `1px solid ${T.hairline}`,
                  fontFamily: FONT_SANS,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink2,
                }}
              >
                {keyword}
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: T.subtle,
                    fontWeight: 700,
                  }}
                >
                  {questionIds.length}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  PRICING BAND
// ────────────────────────────────────────────────────────────────────────
function PricingBand() {
  return (
    <section className="px-5 sm:px-6 md:px-8 py-16 md:py-[100px]">
      <div
        className="mx-auto relative overflow-hidden px-7 py-12 sm:px-10 sm:py-14 md:px-12 md:py-[72px]"
        style={{
          maxWidth: 1100,
          background: T.ink,
          color: T.bg,
          borderRadius: 24,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: `${T.amber}22`,
          }}
        />
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: T.amber,
            letterSpacing: "0.3em",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          평 &nbsp; 생 &nbsp; 무 &nbsp; 료
        </div>
        <h3
          className="text-[44px] md:text-[72px]"
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 900,
            color: T.bg,
            letterSpacing: "-0.04em",
            lineHeight: 1.02,
            margin: "0 0 24px",
            maxWidth: 700,
            position: "relative",
          }}
        >
          결제 0원.<br />
          <span style={{ color: T.amber }}>회원가입도 없어요.</span>
        </h3>
        <p
          style={{
            fontFamily: FONT_SANS,
            fontSize: 18,
            color: `${T.bg}BB`,
            lineHeight: 1.65,
            maxWidth: 560,
            margin: "0 0 40px",
            fontWeight: 500,
          }}
        >
          결제 페이월, 프리미엄 기능 같은 거 없어요. 기출문제와 요약노트, 전부 열어뒀습니다.
        </p>
        <Link
          href="/exam"
          className="no-underline inline-flex items-center"
          style={{
            padding: "18px 32px",
            background: T.amber,
            color: T.paper,
            borderRadius: 999,
            fontSize: 17,
            fontWeight: 800,
            gap: 12,
          }}
        >
          지금 시작하기
          <Icon name="arrow" size={16} color={T.paper} />
        </Link>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  SEO PROSE (preserved — AdSense policy compliance)
// ────────────────────────────────────────────────────────────────────────
function SeoProse({
  examCount,
  totalQuestions,
  keywordCount,
}: {
  examCount: number;
  totalQuestions: number;
  keywordCount: number;
}) {
  return (
    <section
      className="px-5 sm:px-6 md:px-8 py-14 md:py-20"
      style={{
        background: T.bgDeep,
        borderTop: `1px solid ${T.hairline}`,
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 900,
          fontFamily: FONT_SANS,
          color: T.ink2,
          fontSize: 14.5,
          lineHeight: 1.8,
        }}
      >
        <h2
          className="text-[24px] md:text-[32px]"
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 900,
            color: T.ink,
            letterSpacing: "-0.03em",
            margin: "0 0 24px",
          }}
        >
          한국사능력검정시험(한능검) 무료 학습 플랫폼, 기출노트
        </h2>
        <p style={{ marginBottom: 18 }}>
          <b style={{ color: T.ink }}>기출노트</b>는 국사편찬위원회가 주관하는
          한국사능력검정시험(한능검) 준비를 돕기 위해 만들어진 무료 학습 서비스입니다.
          제40회부터 제77회까지 총 {examCount}회차의 기출문제{" "}
          {totalQuestions.toLocaleString()}문항을 회차별·시대별·키워드별로 풀어볼 수
          있고, 모든 문항에는 정답 해설과 최태성 강사의 영상 해설, 시대 배경 자료가 함께
          제공됩니다.
        </p>
        <p style={{ marginBottom: 18 }}>
          한능검은 심화(1·2·3급)와 기본(4·5·6급) 두 과정으로 구성되며, 심화는 1급 80점
          이상·2급 70점 이상·3급 60점 이상 기준으로 급수가 결정됩니다. 공무원 시험
          가산점, 대학·대학원 입시, 승진 가점, 사관학교 지원 등 다양한 목적에
          활용되므로 체계적인 회차별 반복 학습과 시대별 요약 정리가 중요합니다. 본
          사이트는 선사·고조선부터 삼국·남북국·고려·조선 전기·후기·근대·현대까지 8개
          시대를 {keywordCount.toLocaleString()}개 키워드로 세분하여 제공하며, 87개
          시대별 요약노트(총 20만 자 이상)로 개념을 정리할 수 있도록 구성했습니다.
        </p>
        <p>
          학습 방법은 세 가지입니다. 첫째,{" "}
          <Link
            href="/exam"
            style={{ color: T.amber, fontWeight: 700 }}
            className="hover:underline"
          >
            회차별 풀기
          </Link>
          로 최신 기출을 시험장처럼 풀어보고, 둘째,{" "}
          <Link
            href="/study/custom"
            style={{ color: T.amber, fontWeight: 700 }}
            className="hover:underline"
          >
            맞춤형 학습
          </Link>
          으로 약한 시대·유형만 골라 집중 훈련할 수 있습니다. 셋째,{" "}
          <Link
            href="/study/keyword"
            style={{ color: T.amber, fontWeight: 700 }}
            className="hover:underline"
          >
            키워드별 학습
          </Link>
          으로 &lsquo;고인돌&rsquo; &lsquo;규장각&rsquo; &lsquo;신간회&rsquo;처럼 핵심
          키워드만 묶어 반복할 수 있고, 틀린 문제는 자동으로{" "}
          <Link
            href="/wrong-answers"
            style={{ color: T.amber, fontWeight: 700 }}
            className="hover:underline"
          >
            오답 노트
          </Link>
          에 저장되어 복습 세션에서 다시 풀어볼 수 있습니다.
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  KOREAN HISTORY LANDING (formerly default home page)
// ────────────────────────────────────────────────────────────────────────
export default function KoreanHistoryLanding() {
  const exams = getAllExams();
  const keywords = getAllKeywords();
  const latestExams = exams.slice(0, 5);
  const topKeywords = keywords.slice(0, 16);

  const totalQuestions = exams.reduce((s, e) => s + e.questions.length, 0);
  const examCount = exams.length;
  const keywordCount = keywords.length;
  // Note count hard-coded in design (87 — matches data/notes/)
  const noteCount = 87;

  return (
    <div className="gc-fullbleed" style={{ color: T.ink, background: T.bg }}>
      <Hero />
      <StatsBand
        totalQuestions={totalQuestions}
        examCount={examCount}
        noteCount={noteCount}
      />
      <FeatureGrid />
      <ExamPreview />
      <NotesPreview />
      <LinkedPreview />

      {/* Ad: 콘텐츠 둘러본 후 자연스러운 자리 (TOFU + 자체 콘텐츠 제시 후). auto = 모바일 AdFit / 데스크톱 AdSense */}
      <div className="px-5 sm:px-6 md:px-8 py-6 md:py-8">
        <AdSlot size="rectangle" slot={process.env.NEXT_PUBLIC_AD_SLOT_LANDING} />
      </div>

      <LatestExamsBand latestExams={latestExams} topKeywords={topKeywords} />
      <PricingBand />
      <SeoProse
        examCount={examCount}
        totalQuestions={totalQuestions}
        keywordCount={keywordCount}
      />
    </div>
  );
}
