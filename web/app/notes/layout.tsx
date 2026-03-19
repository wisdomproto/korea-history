import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesLayout from "./NotesLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const notes = getNotesIndex();
  const grouped = getNotesGroupedBySection();

  return (
    /* Override parent max-w-3xl — notes need more width for sidebar layout */
    <div className="md:-mx-4 md:px-4 md:max-w-5xl md:w-full md:mx-auto">
      <NotesLayout notes={notes} grouped={grouped}>
        {children}
      </NotesLayout>
    </div>
  );
}
