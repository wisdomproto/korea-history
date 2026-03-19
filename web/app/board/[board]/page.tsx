import { Metadata } from "next";
import { notFound } from "next/navigation";
import BoardList from "./BoardList";

const BOARD_META: Record<string, { label: string; description: string }> = {
  free: { label: "자유 게시판", description: "자유롭게 이야기를 나눠보세요" },
  suggestion: { label: "건의 게시판", description: "서비스 개선을 위한 건의사항을 남겨주세요" },
  notice: { label: "공지사항", description: "공지사항 및 업데이트 안내" },
};

interface Props {
  params: Promise<{ board: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { board } = await params;
  const meta = BOARD_META[board];
  if (!meta) return {};
  return {
    title: `${meta.label} - 기출노트 한능검`,
    description: meta.description,
  };
}

export default async function BoardPage({ params }: Props) {
  const { board } = await params;
  if (!BOARD_META[board]) notFound();

  const meta = BOARD_META[board];

  return (
    <BoardList board={board} label={meta.label} description={meta.description} />
  );
}
