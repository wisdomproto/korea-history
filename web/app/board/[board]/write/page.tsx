import { notFound } from "next/navigation";
import WriteForm from "./WriteForm";

const BOARD_META: Record<string, string> = {
  free: "자유 게시판",
  suggestion: "건의 게시판",
  notice: "공지사항",
};

interface Props {
  params: Promise<{ board: string }>;
}

export default async function WritePage({ params }: Props) {
  const { board } = await params;
  if (!BOARD_META[board]) notFound();

  return <WriteForm board={board} label={BOARD_META[board]} />;
}
