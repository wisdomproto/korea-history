import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gcnote.co.kr"),
  title: {
    default: "기출노트 한능검 - 한국사능력검정시험 기출문제 풀기 & 해설",
    template: "%s | 기출노트 한능검",
  },
  description:
    "한국사능력검정시험 기출문제 풀기, AI 해설, 시대별 요약노트, 최태성 영상강의. 40~77회 1,900+ 문항 무료.",
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
