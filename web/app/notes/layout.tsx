import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesLayout from "./NotesLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const notes = getNotesIndex();
  const grouped = getNotesGroupedBySection();

  return (
    <NotesLayout notes={notes} grouped={grouped}>
      {children}
    </NotesLayout>
  );
}
