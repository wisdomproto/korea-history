import { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

export default function robots(): MetadataRoute.Robots {
  // 모든 봇 공통 차단 (관리자·API·localStorage 전용 빈 UI)
  const sharedDisallow = [
    "/admin/",
    "/api/",
    "/study/session",
    // localStorage UI — 색인 X (AdSense 콘텐츠 평가에서 빈 페이지 제외)
    "/wrong-answers",
    "/my-record",
    "/*/wrong-answers",
    "/*/my-record",
    "/*/*/wrong-answers",
    "/*/*/my-record",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: sharedDisallow,
      },
      {
        // Anthropic ClaudeBot 등 AI 크롤러 — 검색 색인 가치 0인데 무캐시 양산 페이지를
        // 대량 크롤(Vercel function invocation 폭증)함. CBT·공무원 thin 표면만 차단:
        // /[examSlug]/[subjectSlug]/exam* 과 /notes (수만 URL). 한능검 /exam·/notes·
        // 랜딩 등 양질 콘텐츠는 계속 허용해 Claude 답변 노출(GEO)은 유지.
        userAgent: ["ClaudeBot", "anthropic-ai", "Claude-Web"],
        allow: "/",
        disallow: [...sharedDisallow, "/*/*/exam", "/*/*/notes"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
