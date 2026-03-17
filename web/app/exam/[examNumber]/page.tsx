import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAllExamNumbers, getExamByNumber } from "@/lib/data";
import { examMeta } from "@/lib/seo";

interface Props {
  params: Promise<{ examNumber: string }>;
}

export function generateStaticParams() {
  const numbers = getAllExamNumbers();
  return numbers.map((n) => ({ examNumber: String(n) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { examNumber } = await params;
  const examFile = getExamByNumber(Number(examNumber));
  if (!examFile) return {};
  return examMeta(examFile.exam);
}

/** Redirect straight to question 1 — mirrors the original app behavior. */
export default async function ExamDetailPage({ params }: Props) {
  const { examNumber } = await params;
  const examFile = getExamByNumber(Number(examNumber));
  if (!examFile) notFound();

  redirect(`/exam/${examNumber}/1`);
}
