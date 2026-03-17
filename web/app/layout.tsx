import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "한국사기출 - 한국사능력검정시험 기출문제 & 요약노트",
    template: "%s | 한국사기출",
  },
  description:
    "한국사능력검정시험 기출문제 풀기, 정답 해설, 시대별 요약노트. 3,000+ 문항 무료 제공.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "한국사기출",
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
      <body className="antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
