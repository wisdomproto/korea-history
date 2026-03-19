import { Metadata } from "next";
import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesHome from "./NotesHome";

export const metadata: Metadata = {
  title: "요약노트 - 시대별 한국사 핵심 정리",
  description:
    "한국사능력검정시험 시대별 핵심 요약노트. 선사시대부터 현대까지 87개 주제별 정리.",
};

export default function NotesPage() {
  const notes = getNotesIndex();
  const grouped = getNotesGroupedBySection();

  return <NotesHome notes={notes} grouped={grouped} />;
}
