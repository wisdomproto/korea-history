import { Metadata } from "next";

export const metadata: Metadata = {
  title: "요약노트 - 시대별 한국사 핵심 정리",
  description:
    "한국사능력검정시험 시대별 핵심 요약노트. 선사시대부터 현대까지.",
};

export default function NotesPage() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-bold mb-4">요약노트</h1>
      <p className="text-gray-500">시대별 핵심 요약노트를 준비 중입니다.</p>
      <p className="text-gray-400 text-sm mt-2">곧 만나보실 수 있습니다!</p>
    </div>
  );
}
