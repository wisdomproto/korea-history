import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gcnote.co.kr"),
  title: {
    default: "한능검 기출문제 무료 풀기 - 1,900문항 해설·요약노트",
    template: "%s | 기출노트 한능검",
  },
  description:
    "한능검 기출문제 풀기, AI 해설, 시대별 요약노트, 최태성 영상강의. 40~77회 1,900+ 문항 무료 제공. 한국사능력검정시험 1급 합격을 위한 최적의 학습 플랫폼.",
  keywords: ["한국사능력검정시험", "한능검", "기출문제", "한국사", "요약노트", "해설", "1급", "2급", "심화"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "기출노트 한능검",
    url: "https://gcnote.co.kr",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://gcnote.co.kr",
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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-CJ7V236NQV" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-CJ7V236NQV');`,
          }}
        />
      </head>
      <body className="antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
