/**
 * Blog system — long-form SEO content (4,000~8,000+ chars per post).
 *
 * Pattern: complementary to /notes (which are short summaries).
 * - /notes — quick reference, 시험 직전 복습
 * - /blog — deep guide, 처음 공부 + 검색 진입로
 *
 * Each post targets 1 golden keyword (네이버 API 실측).
 * Source: docs/seo-strategy.html § 06 + memory/seo_strategy_v1.md
 */

import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "data", "blog");

export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string; // ISO date
  updatedAt: string;
  primaryKeyword: string;
  /** Naver monthly volume (실측) — for prioritization */
  naverVolume: number;
  /** Naver competition: 낮음 / 중간 / 높음 */
  naverCompetition: string;
  keywords: string[];
  /** Era / category for grouping */
  era: string;
  /** Related note section ID (e.g. "s3-09") */
  relatedNoteId: string | null;
  /** Related question filter — passed to /study/session?ids= or era query */
  relatedEra: string | null;
  /** Estimated read time in minutes */
  readMinutes: number;
}

export interface BlogPost extends BlogPostMeta {
  /** Sanitized HTML content (full article body) */
  html: string;
  /** Optional FAQ Q&As (rendered + JSON-LD) */
  faq?: Array<{ q: string; a: string }>;
}

let cachedPosts: BlogPost[] | null = null;

function loadAllPosts(): BlogPost[] {
  if (cachedPosts) return cachedPosts;
  if (!fs.existsSync(BLOG_DIR)) {
    cachedPosts = [];
    return cachedPosts;
  }
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".json"));
  cachedPosts = files
    .map((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), "utf-8");
      return JSON.parse(raw) as BlogPost;
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  return cachedPosts;
}

export function getAllBlogPosts(): BlogPostMeta[] {
  return loadAllPosts().map(({ html, faq, ...meta }) => meta);
}

export function getAllBlogSlugs(): string[] {
  return loadAllPosts().map((p) => p.slug);
}

export function getBlogPost(slug: string): BlogPost | null {
  return loadAllPosts().find((p) => p.slug === slug) ?? null;
}

export function getRelatedPosts(slug: string, limit: number = 3): BlogPostMeta[] {
  const target = getBlogPost(slug);
  if (!target) return [];
  return loadAllPosts()
    .filter((p) => p.slug !== slug)
    .map((p) => {
      // Score: era match (3) + shared keywords (1 per)
      let score = 0;
      if (p.era === target.era) score += 3;
      score += p.keywords.filter((k) => target.keywords.includes(k)).length;
      return { post: p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post: { html, faq, ...meta } }) => meta);
}

export function getBlogPostByRelatedNoteId(noteId: string): BlogPostMeta | null {
  const post = loadAllPosts().find((p) => p.relatedNoteId === noteId);
  if (!post) return null;
  const { html, faq, ...meta } = post;
  return meta;
}
