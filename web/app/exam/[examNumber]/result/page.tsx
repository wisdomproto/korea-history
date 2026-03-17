import { getAllExamNumbers } from "@/lib/data";
import ExamResult from "./ExamResult";

export async function generateStaticParams() {
  return getAllExamNumbers().map((n) => ({ examNumber: String(n) }));
}

interface Props {
  params: Promise<{ examNumber: string }>;
}

export default async function ResultPage({ params }: Props) {
  const { examNumber } = await params;
  return <ExamResult examNumber={Number(examNumber)} />;
}
