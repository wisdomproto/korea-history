import { MetadataRoute } from "next";
import { getAllExams, getAllQuestionParams } from "@/lib/data";
import { getAllNoteIds } from "@/lib/notes";
import { getAllExamTypes, getCategories } from "@/lib/exam-types";

export const dynamic = "force-static";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/study`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/study/custom`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/study/keyword`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/exam`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/notes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/wrong-answers`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/board`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/my-record`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.1,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.1,
    },
  ];

  const questionParams = getAllQuestionParams();
  const questionPages: MetadataRoute.Sitemap = questionParams.map((p) => ({
    url: `${BASE_URL}/exam/${p.examNumber}/${p.questionNumber}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const noteIds = getAllNoteIds();
  const notePages: MetadataRoute.Sitemap = noteIds.map((id) => ({
    url: `${BASE_URL}/notes/${id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Multi-exam hub pages — main landing per exam type + category indexes
  const examTypePages: MetadataRoute.Sitemap = getAllExamTypes().map((e) => ({
    url: `${BASE_URL}${e.routes.main}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: e.featured ? 0.9 : 0.6,
  }));

  return [...staticPages, ...questionPages, ...notePages, ...examTypePages];
}
