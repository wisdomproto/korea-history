import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "기출노트 소개 — 한능검 무료 학습 사이트",
  description:
    "기출노트는 1인 개발자가 운영하는 한국사능력검정시험 무료 학습 플랫폼입니다. 운영 동기, 콘텐츠 제작 원칙, 운영자 정보, 연락처를 안내합니다.",
  keywords: [
    "기출노트 소개",
    "기출노트 운영자",
    "한능검 무료 학습",
    "기출노트 about",
    "한국사 학습 플랫폼",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "기출노트 소개 — 한능검 무료 학습 사이트",
    description: "1인 개발자가 운영하는 한국사능력검정시험 무료 학습 플랫폼.",
    url: "/about",
    type: "profile",
    siteName: "기출노트 한능검",
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

export default function AboutPage() {
  // AboutPage + Person schema for E-E-A-T signal
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "기출노트 소개",
    url: `${SITE_URL}/about`,
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    description:
      "기출노트는 1인 개발자가 운영하는 한국사능력검정시험 무료 학습 플랫폼입니다.",
    mainEntity: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "기출노트",
      url: SITE_URL,
      foundingDate: "2025-09-01",
      founder: {
        "@type": "Person",
        name: "기출노트 운영자",
        email: "kil210@tangobook.co.kr",
        jobTitle: "Founder & Web Developer",
        description:
          "1인 개발자, 기출노트 한능검 학습 플랫폼 기획·개발·운영",
        knowsAbout: [
          "한국사",
          "한국사능력검정시험",
          "웹 개발",
          "교육 콘텐츠 기획",
        ],
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "kil210@tangobook.co.kr",
        contactType: "customer support",
        availableLanguage: ["Korean"],
      },
    },
  };

  return (
    <article className="max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      {/* Header */}
      <header className="mb-10 pb-6 border-b border-slate-200">
        <p className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-wider mb-2">
          About · 기출노트 소개
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          한국사를 누구나 무료로 공부할 수 있도록
        </h1>
        <p className="text-[15px] text-slate-600 leading-relaxed">
          기출노트는 1인 개발자가 운영하는 한국사능력검정시험 무료 학습 플랫폼입니다.
          시험 자료가 비싸고 흩어져 있어 어려움을 겪는 수험생들에게,
          누구나 평생 무료로 학습할 수 있는 통합 자료를 제공하는 것을 목표로 만들었습니다.
        </p>
      </header>

      {/* Why we made this */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">왜 만들었나요</h2>
        <div className="space-y-3 text-[15px] text-slate-700 leading-[1.85]">
          <p>
            한국사능력검정시험을 준비하면서 가장 답답했던 점은
            <strong> 자료가 흩어져 있다는 것</strong>이었습니다.
            기출문제는 PDF로, 해설은 유튜브에, 요약노트는 별도 사이트에서 비싸게 팔리고 있었죠.
            한 곳에서 풀고, 틀린 문제는 자동으로 모이고, 관련 시대를 바로 복습할 수 있는
            통합 학습 자료가 있으면 좋겠다는 단순한 동기에서 시작했습니다.
          </p>
          <p>
            제가 만들 수 있는 한 가지는 <strong>웹사이트</strong>였고,
            그래서 1년에 가까운 시간을 들여 1,900여 개 기출문제와 87편 시대별 요약노트,
            22편 long-form 한국사 가이드, 그리고 모든 문제를 시대별·키워드별로 묶는 학습 도구를 만들었습니다.
            모든 자료는 <strong>평생 무료</strong>이고, 별도 가입 없이 누구나 바로 사용할 수 있습니다.
          </p>
        </div>
      </section>

      {/* Who I am */}
      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-3">운영자 소개</h2>
        <div className="space-y-3 text-[15px] text-slate-700 leading-[1.85]">
          <p>
            기출노트는 <strong>1인 개발자</strong>가 기획·개발하고 직접 운영합니다.
            한국사 시험을 직접 준비해 본 경험이 있고,
            웹 개발을 본업으로 하는 사람으로서
            &ldquo;내가 학습할 때 있었으면 좋았을 자료&rdquo;를 직접 만들어 보자는 생각으로 시작했습니다.
          </p>
          <p>
            기출노트 외에도{" "}
            <a
              href="https://tangobook.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 font-semibold underline"
            >
              tangobook.co.kr
            </a>{" "}
            등 몇 개의 개인 프로젝트를 운영합니다.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-2 gap-3 text-[14px]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                연락처
              </div>
              <a
                href="mailto:kil210@tangobook.co.kr"
                className="text-emerald-600 font-semibold"
              >
                kil210@tangobook.co.kr
              </a>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                답변 약속
              </div>
              <span className="text-slate-700">영업일 기준 3일 내</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content principles */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">콘텐츠 제작 원칙</h2>
        <ul className="space-y-3 text-[15px] text-slate-700 leading-[1.75]">
          <li className="flex gap-3">
            <span className="font-bold text-amber-700 shrink-0">1.</span>
            <div>
              <strong>공식 자료 기반</strong>: 모든 한국사 콘텐츠는 국사편찬위원회·
              한국학중앙연구원·두산백과 등 공인 자료와 한국사 교과서를 참고해 작성합니다.
              사실 검증을 거쳐 게재하며, 잘못된 내용은 발견 즉시 수정합니다.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-amber-700 shrink-0">2.</span>
            <div>
              <strong>실제 출제 경향 반영</strong>: 한국사능력검정시험 제40회부터 제77회까지
              1,900+ 문항을 실제 분석해 빈출 주제·키워드·시대를 추출하고,
              요약노트와 블로그 글의 우선순위를 결정합니다.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-amber-700 shrink-0">3.</span>
            <div>
              <strong>AI는 도구, 검수는 사람</strong>: 콘텐츠 초안 작성에 생성형 AI 도구를
              활용하지만, 모든 글은 운영자가 직접 검토·수정·보강한 뒤 게재합니다.
              이미지도 AI로 생성하되 한국 전통 회화 스타일로 통일성을 유지하며,
              부적절하다고 판단되면 사용하지 않습니다.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-amber-700 shrink-0">4.</span>
            <div>
              <strong>지속 업데이트</strong>: 새로운 회차의 한능검이 시행되면 기출문제를
              추가하고, 학습자 피드백·문의를 반영해 요약노트와 블로그 글을 정기적으로 보강합니다.
              마지막 수정일은 각 페이지 상단에 표시됩니다.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-amber-700 shrink-0">5.</span>
            <div>
              <strong>무료 + 광고로 운영</strong>: 학습 자료는 평생 무료입니다.
              사이트 유지에 필요한 비용(서버·도메인·운영 시간)은
              광고 수익으로 일부 충당합니다.
              학습에 방해되지 않는 위치에만 광고를 배치하려고 노력합니다.
            </div>
          </li>
        </ul>
      </section>

      {/* What's here */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">사이트에서 할 수 있는 것</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/exam"
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="text-base font-bold text-slate-900 mb-1">
              📖 기출문제 풀기
            </div>
            <div className="text-[13px] text-slate-600">
              제40~77회 1,900+ 문항. 회차별·시대별·키워드별 자유 선택
            </div>
          </Link>
          <Link
            href="/notes"
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="text-base font-bold text-slate-900 mb-1">
              📝 요약노트 87편
            </div>
            <div className="text-[13px] text-slate-600">
              7개 시대별 시험 출제 포인트 정리 + 영상 강의 연동
            </div>
          </Link>
          <Link
            href="/blog"
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="text-base font-bold text-slate-900 mb-1">
              📚 블로그 가이드
            </div>
            <div className="text-[13px] text-slate-600">
              병자호란·훈민정음·대동법 등 깊이 있는 long-form 학습 가이드
            </div>
          </Link>
          <Link
            href="/wrong-answers"
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="text-base font-bold text-slate-900 mb-1">
              🔁 오답 자동 수집·복습
            </div>
            <div className="text-[13px] text-slate-600">
              틀린 문제를 자동으로 모아 약점 시대만 골라 재학습
            </div>
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mb-10 rounded-2xl bg-slate-50 border border-slate-200 p-5 text-[13px] text-slate-600 leading-[1.7]">
        <h2 className="text-base font-bold text-slate-900 mb-2">고지사항</h2>
        <p className="mb-2">
          기출노트는 <strong>국사편찬위원회와 무관한 비공식 학습 자료 사이트</strong>입니다.
          한국사능력검정시험 자체는 국사편찬위원회 주관이며,
          시험 일정·접수·공식 발표는{" "}
          <a
            href="https://www.historyexam.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 underline"
          >
            historyexam.go.kr
          </a>{" "}
          에서 확인 가능합니다.
        </p>
        <p>
          본 사이트의 기출문제는 학습 목적으로만 사용되며, 저작권은 원저작권자에게 있습니다.
          잘못된 내용을 발견하시거나 저작권 관련 요청이 있으시면{" "}
          <a
            href="mailto:kil210@tangobook.co.kr"
            className="text-emerald-700 underline"
          >
            kil210@tangobook.co.kr
          </a>{" "}
          로 연락 주세요.
        </p>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">관련 페이지</h2>
        <ul className="space-y-1.5 text-[14px]">
          <li>
            <Link href="/privacy" className="text-emerald-600 underline">
              개인정보처리방침
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-emerald-600 underline">
              이용약관
            </Link>
          </li>
          <li>
            <Link href="/board" className="text-emerald-600 underline">
              게시판 (공지·문의·자유)
            </Link>
          </li>
        </ul>
      </section>
    </article>
  );
}
