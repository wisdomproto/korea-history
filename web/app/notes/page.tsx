import { Metadata } from "next";
import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesHome from "./NotesHome";

export const metadata: Metadata = {
  title: "한능검 요약노트 - 시대별 핵심 정리 87개",
  description:
    "한능검 시대별 핵심 요약노트. 선사시대부터 현대까지 87개 주제별 정리. 최태성 영상강의 연동.",
  alternates: { canonical: "/notes" },
};

export default function NotesPage() {
  const notes = getNotesIndex();
  const grouped = getNotesGroupedBySection();

  return <NotesHome notes={notes} grouped={grouped} />;
}
