import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllBlogSlugs,
  getBlogPost,
  getRelatedPosts,
} from "@/lib/blog";
import { getNoteById } from "@/lib/notes";
import { breadcrumbJsonLd } from "@/lib/seo";
import BreadCrumb from "@/components/BreadCrumb";
import ShareButtons from "@/components/ShareButtons";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  const path = `/blog/${slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: { canonical: path },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: path,
      type: "article",
      siteName: "기출노트 한능검",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(slug, 3);
  const relatedNote = post.relatedNoteId ? getNoteById(post.relatedNoteId) : null;

  const breadcrumbs = [
    { name: "홈", href: "/" },
    { name: "블로그", href: "/blog" },
    { name: post.primaryKeyword, href: `/blog/${slug}` },
  ];

  // BlogPosting JSON-LD — primary article schema for Google Search
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${slug}`,
    },
    keywords: post.keywords.join(", "),
    about: [
      { "@type": "Thing", name: post.primaryKeyword },
      { "@type": "Thing", name: post.era },
      { "@type": "Thing", name: "한국사능력검정시험" },
      ...post.keywords.slice(0, 5).map((k) => ({ "@type": "Thing", name: k })),
    ],
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    timeRequired: `PT${post.readMinutes}M`,
  };

  // FAQ JSON-LD if FAQs exist (rich result eligibility)
  const faqJsonLd = post.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      }
    : null;

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <BreadCrumb
        items={[
          { label: "블로그", href: "/blog" },
          { label: post.primaryKeyword },
        ]}
      />

      {/* Header */}
      <header className="mb-6 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            {post.era}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {post.readMinutes}분 읽기
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {post.publishedAt}
            {post.publishedAt !== post.updatedAt && ` · 수정 ${post.updatedAt}`}
          </span>
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-extrabold text-slate-900 leading-tight mb-3">
          {post.title}
        </h1>
        <p className="text-[15px] text-slate-600 leading-relaxed">
          {post.excerpt}
        </p>
      </header>

      {/* Body */}
      <div
        className="blog-prose"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      {/* FAQ section (rendered visibly + JSON-LD above) */}
      {post.faq?.length ? (
        <section className="mt-10 pt-6 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">자주 묻는 질문</h2>
          <ul className="space-y-3">
            {post.faq.map((f, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="font-bold text-slate-900 mb-2 text-[14px]">Q. {f.q}</p>
                <p className="text-[13px] text-slate-600 leading-relaxed">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* CTA — related note + related quiz */}
      <section className="mt-10 pt-6 border-t border-slate-200 grid sm:grid-cols-2 gap-3">
        {relatedNote && (
          <Link
            href={`/notes/${relatedNote.id}`}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
          >
            <div className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
              빠른 복습 →
            </div>
            <div className="text-base font-bold text-slate-900 mb-1">
              {relatedNote.title}
            </div>
            <div className="text-[12px] text-slate-600">
              요약노트로 핵심만 빠르게 보기
            </div>
          </Link>
        )}
        <Link
          href={`/study/custom`}
          className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
        >
          <div className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider mb-1.5">
            관련 기출 풀기 →
          </div>
          <div className="text-base font-bold text-slate-900 mb-1">
            {post.relatedEra} 시대 문제 풀이
          </div>
          <div className="text-[12px] text-slate-600">
            방금 읽은 내용으로 한능검 기출문제 도전
          </div>
        </Link>
      </section>

      {/* Share */}
      <section className="mt-8 flex items-center justify-between flex-wrap gap-3 pt-6 border-t border-slate-200">
        <div className="text-[13px] text-slate-500">
          이 글이 도움이 되었다면 공유해 주세요
        </div>
        <ShareButtons
          title={post.title}
          url={`${SITE_URL}/blog/${slug}`}
          description={post.excerpt}
        />
      </section>

      {/* Related blog posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-10 pt-6 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">관련 글</h2>
          <ul className="space-y-2">
            {relatedPosts.map((rp) => (
              <li key={rp.slug}>
                <Link
                  href={`/blog/${rp.slug}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  <div>
                    <div className="text-[14px] font-bold text-slate-900 leading-snug">
                      {rp.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {rp.era} · {rp.readMinutes}분
                    </div>
                  </div>
                  <svg
                    className="h-4 w-4 text-slate-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
