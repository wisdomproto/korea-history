import { Metadata } from "next";

export const metadata: Metadata = {
  title: "오답노트",
  description:
    "틀린 문제를 자동으로 모아 복습하세요. 다시 풀어서 맞추면 자동 해결!",
};

export default function WrongAnswersPage() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-bold mb-4">오답노트</h1>
      <p className="text-gray-500">오답노트 기능을 준비 중입니다.</p>
      <p className="text-gray-400 text-sm mt-2">곧 만나보실 수 있습니다!</p>
    </div>
  );
}
