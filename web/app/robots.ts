import { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
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
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
