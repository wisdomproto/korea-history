import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdSlot from "@/components/AdSlot";
import { getAllExamTypes, getAllSubjects } from "@/lib/exam-types";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gcnote.co.kr"),
  title: {
    default: "한능검 기출문제 무료 풀기 - 1,900문항 해설·요약노트",
    template: "%s | 기출노트 한능검",
  },
  description:
    "한능검 기출문제 1,900+ 문항 무료 풀기. AI 해설, 요약노트, 영상강의까지 한번에.",
  keywords: ["한국사능력검정시험", "한능검", "기출문제", "한국사", "요약노트", "해설", "1급", "2급", "심화"],
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
          <aside
            aria-label="광고"
            className="fixed right-4 top-1/2 z-10 hidden -translate-y-1/2 xl:block"
          >
            <AdSlot size="skyscraper" provider="adfit" />
          </aside>
          <Footer />
        </div>
      </body>
    </html>
  );
}
