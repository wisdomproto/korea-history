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
    // CBT·공무원 기출/문제 표면 (/[examSlug]/[subjectSlug]/exam/**) — 100만+ URL.
    // 6/9 게이트로 이미 전부 noindex(civilQuestionMeta/ExamListMeta always noindex)라
    // 검색 순위 손실 0. AdSense 리뷰어가 noindex는 무시하고 내부링크로 크롤·평가하므로
    // (noindex≠크롤차단) 양산 thin 표면을 robots Disallow로 전체 봇에서 제거 — low value 대응.
    // 한능검 /exam/78/1 (segment 3="1") 과 /notes/s1-01 는 /*/*/exam·/*/*/notes 패턴에
    // 안 걸려 그대로 허용. 수동 civil notes(/civil-notes/**, /*/*/notes)도 영향 없음.
    "/*/*/exam",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: sharedDisallow,
      },
      {
        // Anthropic ClaudeBot 등 AI 크롤러 — Vercel function invocation 폭증 대응.
        // 위 공통 /*/*/exam 차단에 더해 /*/*/notes(통합 노트)까지 차단. 통합 노트는
        // 23개 수동 과목이 실제 색인 콘텐츠라 Googlebot엔 열어두고(SEO 보존),
        // ClaudeBot만 추가 차단(GEO 가치 대비 크롤 비용 큼).
        userAgent: ["ClaudeBot", "anthropic-ai", "Claude-Web"],
        allow: "/",
        disallow: [...sharedDisallow, "/*/*/notes"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
