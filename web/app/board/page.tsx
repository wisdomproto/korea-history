import { Suspense } from "react";
import { Metadata } from "next";
import BoardTabs from "./BoardTabs";

export const metadata: Metadata = {
  title: "게시판 - 기출노트 한능검",
  description: "한국사능력검정시험 학습 커뮤니티 게시판",
};

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">불러오는 중...</div>}>
      <BoardTabs />
    </Suspense>
  );
}
