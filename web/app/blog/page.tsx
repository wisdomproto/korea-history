import { Metadata } from "next";
import Link from "next/link";
import { getAllBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "한능검 한국사 깊이 있는 가이드 | 기출노트 블로그",
  description:
    "기출노트가 만든 한국사 깊이 있는 학습 가이드. 병자호란·훈민정음·대동법 등 핵심 주제를 배경부터 결과까지 단계별로 정리. 한능검 출제 패턴 + 빈출 인물 + 비교표까지 한 번에.",
  keywords: [
    "한국사 가이드", "한능검 가이드", "한능검 정리",
    "한국사 블로그", "기출노트 블로그", "기출노트",
    "한국사 깊이 정리", "한능검 무료 학습",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "한능검 한국사 깊이 있는 가이드 | 기출노트 블로그",
    description: "한국사 핵심 주제를 배경부터 결과까지 단계별로 정리한 학습 가이드.",
    url: "/blog",
    type: "website",
    siteName: "기출노트 한능검",
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "기출노트 블로그 — 한능검 한국사 가이드",
    description: "한국사 핵심 주제 깊이 있는 학습 가이드. 한능검 출제 패턴 + 빈출 인물 + 비교표.",
    url: `${SITE_URL}/blog`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "ko-KR",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt,
      keywords: p.keywords.join(", "),
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <header className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
          한능검 한국사 깊이 있는 가이드
        </h1>
        <p className="text-sm text-slate-500">
          기출노트가 만든 한국사 학습 가이드 · {posts.length}편
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-emerald-100 bg-white p-5 card-shadow text-[13px] leading-[1.75] text-slate-600 space-y-2.5">
        <p>
          <strong>기출노트 블로그</strong>는 <Link href="/notes" className="text-emerald-600 font-semibold hover:underline">요약노트</Link>가 다 담지 못한
          <strong> 깊이 있는 한국사 학습 가이드</strong>입니다. 요약노트가 시험 직전 빠른 복습용이라면,
          블로그는 처음 공부하거나 한 주제를 깊이 이해하고 싶은 분을 위한 자료입니다.
        </p>
        <p>
          각 글은 <strong>배경 — 진행 — 결과 — 인물 — 한능검 출제 패턴</strong>까지
          한 주제를 5,000~8,000자로 정리합니다. 정묘호란과 병자호란의 차이, 광해군과 인조의 외교 비교,
          김상헌과 최명길의 척화-주화 대립 같은 <strong>한능검 빈출 비교 포인트</strong>를 표로 한눈에 볼 수 있도록 구성했습니다.
        </p>
        <p>
          글 끝에는 항상 <strong>관련 요약노트 링크 + 관련 기출 풀기 버튼</strong>이 있어,
          깊이 이해 → 빠른 복습 → 문제 풀기로 자연스럽게 이어집니다. 평생 무료입니다.
        </p>
      </section>

      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 card-shadow hover:card-shadow-md hover:border-emerald-200 transition-all"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  {post.era}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {post.readMinutes}분 읽기
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-auto">
                  {post.publishedAt}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1.5 leading-snug">
                {post.title}
              </h2>
              <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2">
                {post.excerpt}
              </p>
              <div className="mt-3 flex items-center flex-wrap gap-1.5">
                {post.keywords.slice(0, 5).map((k) => (
                  <span
                    key={k}
                    className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {posts.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-sm">
          블로그 글이 곧 발행됩니다.
        </div>
      )}
    </div>
  );
}
