import Link from "next/link";

const FOOTER_COLS: { t: string; items: { label: string; href: string }[] }[] = [
  {
    t: "학습",
    items: [
      { label: "기출문제",  href: "/exam" },
      { label: "요약노트",  href: "/notes" },
      { label: "오답노트",  href: "/wrong-answers" },
      { label: "내 기록",   href: "/my-record" },
    ],
  },
  {
    t: "회차별",
    items: [
      { label: "제77회",     href: "/exam/77" },
      { label: "제76회",     href: "/exam/76" },
      { label: "제75회",     href: "/exam/75" },
      { label: "전체 보기",  href: "/exam" },
    ],
  },
  {
    t: "정보",
    items: [
      { label: "게시판",           href: "/board" },
      { label: "개인정보처리방침", href: "/privacy" },
      { label: "이용약관",         href: "/terms" },
      { label: "문의",             href: "mailto:kil210@tangobook.co.kr" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--gc-bg-deep)",
        borderTop: "1px solid var(--gc-hairline)",
        marginTop: 80,
      }}
    >
      <div
        className="mx-auto max-w-[1280px] px-6 md:px-8"
        style={{
          padding: "48px 24px 32px",
          fontFamily: "var(--gc-font-sans)",
          color: "var(--gc-subtle)",
          fontSize: 13,
        }}
      >
        <div className="flex flex-col md:flex-row gap-10 md:gap-20 mb-8">
          <div className="max-w-[320px]">
            <div
              className="flex items-baseline gap-1.5"
              style={{ marginBottom: 8 }}
            >
              <span
                className="font-serif-kr"
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "var(--gc-ink)",
                  letterSpacing: "-0.03em",
                }}
              >
                기출노트
              </span>
              <span
                className="font-sans-kr"
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--gc-amber)",
                  letterSpacing: "-0.01em",
                }}
              >
                한능검
              </span>
            </div>
            <div style={{ lineHeight: 1.7 }}>
              <b style={{ color: "var(--gc-ink)" }}>기출노트</b>는 한국사능력검정시험(한능검)
              무료 학습 플랫폼입니다. 제40회부터 제77회까지 1,900+ 기출문제와
              시대별 요약노트 87편을 평생 무료로 제공합니다.
            </div>
          </div>
          <div className="flex gap-10 md:gap-16 flex-1 md:justify-end flex-wrap">
            {FOOTER_COLS.map((col) => (
              <div key={col.t}>
                <div
                  style={{
                    color: "var(--gc-ink)",
                    fontWeight: 700,
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  {col.t}
                </div>
                {col.items.map((i) => (
                  <div key={i.label} style={{ marginBottom: 6 }}>
                    <Link
                      href={i.href}
                      className="no-underline transition-colors hover:text-[color:var(--gc-ink)]"
                      style={{ color: "var(--gc-subtle)" }}
                    >
                      {i.label}
                    </Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div
          className="font-mono-kr flex flex-col md:flex-row justify-between gap-2"
          style={{
            paddingTop: 24,
            borderTop: "1px solid var(--gc-hairline)",
            fontSize: 11,
            letterSpacing: "0.05em",
          }}
        >
          <div>© {new Date().getFullYear()} gcnote.co.kr · All rights reserved</div>
          <div>한국사능력검정시험은 국사편찬위원회 주관 시험입니다</div>
        </div>
      </div>
    </footer>
  );
}
