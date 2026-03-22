import { Suspense } from "react";
import { Metadata } from "next";
import BoardTabs from "./BoardTabs";

export const metadata: Metadata = {
  title: "한능검 커뮤니티 게시판 - 질문·건의·공지",
  description: "한능검 학습 커뮤니티. 자유 게시판, 건의사항, 공지사항. 함께 공부해요!",
  alternates: { canonical: "/board" },
};

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">불러오는 중...</div>}>
      <BoardTabs />
    </Suspense>
  );
}
