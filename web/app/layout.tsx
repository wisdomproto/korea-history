import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllExamTypes, getAllSubjects } from "@/lib/exam-types";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gcnote.co.kr"),
  title: {
    default: "기출노트 — 한능검 기출문제와 요약노트 무료",
    template: "%s | 기출노트 한능검",
  },
  description:
    "기출노트는 한능검(한국사능력검정시험) 기출문제 1,900+ 문항과 시대별 요약노트 87편을 무료로 제공하는 학습 플랫폼입니다. AI 해설과 강의 영상까지.",
  keywords: ["기출노트", "기출노트 한능검", "한국사능력검정시험", "한능검", "한능검 요약노트", "한능검 기출문제", "한국사", "요약노트", "해설", "1급", "2급", "심화"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "기출노트 한능검",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Site-wide Organization + WebSite structured data (applies to every page)
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://gcnote.co.kr/#organization",
      name: "기출노트",
      alternateName: ["gcnote", "기출노트 한능검"],
      url: "https://gcnote.co.kr",
      description:
        "한국사능력검정시험(한능검) 기출문제와 시대별 요약노트를 무료로 제공하는 학습 플랫폼. 1인 개발자가 직접 기획·개발·운영합니다.",
      foundingDate: "2025-09-01",
      founder: {
        "@type": "Person",
        name: "기출노트 운영자",
        email: "kil210@tangobook.co.kr",
        jobTitle: "Founder & Web Developer",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "kil210@tangobook.co.kr",
        contactType: "customer support",
        availableLanguage: ["Korean"],
      },
      knowsAbout: [
        "한국사",
        "한국사능력검정시험",
        "한능검",
        "한국사 학습",
        "역사 교육",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://gcnote.co.kr/#website",
      name: "기출노트 한능검",
      alternateName: "기출노트",
      url: "https://gcnote.co.kr",
      inLanguage: "ko-KR",
      publisher: { "@id": "https://gcnote.co.kr/#organization" },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Design system fonts — Noto Serif KR (headlines), Pretendard (body), JetBrains Mono (labels) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
          rel="stylesheet"
        />
        {/* AdSense — SDK 항상 로드 (심사 위해 필수). 광고 표시는 NEXT_PUBLIC_ADSENSE_ENABLED + slot 기반 */}
        <meta name="google-adsense-account" content="ca-pub-6002059361162458" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6002059361162458" crossOrigin="anonymous" />
        {/* AdFit (카카오 애드핏) — ENV 활성화 시에만 로드 */}
        {process.env.NEXT_PUBLIC_ADFIT_ENABLED === "true" && (
          <script async src="https://t1.kakaocdn.net/kas/static/ba.min.js" />
        )}
        <meta name="naver-site-verification" content="e79f5c36354d88f45d3cd7b622df34f3d570a336" />
        {/* Schema.org Organization + WebSite — brand entity signal for "기출노트" */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-CJ7V236NQV" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-CJ7V236NQV');`,
          }}
        />
        <script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js" async />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('load',function(){if(window.Kakao&&!window.Kakao.isInitialized()){window.Kakao.init('${process.env.NEXT_PUBLIC_KAKAO_JS_KEY || ""}');}});`,
          }}
        />
      </head>
      <body className="antialiased">
        <div className="flex min-h-screen flex-col">
          <Header examTypes={getAllExamTypes()} subjects={getAllSubjects()} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
