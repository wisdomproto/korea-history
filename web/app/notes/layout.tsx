import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesLayout from "./NotesLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const notes = getNotesIndex();
  const grouped = getNotesGroupedBySection();

  return (
    /* Break out of parent max-w-3xl by using negative margins + full viewport width */
    <div className="md:relative md:left-1/2 md:-translate-x-1/2 md:w-[calc(100vw-2rem)] md:max-w-5xl md:px-4">
      <NotesLayout notes={notes} grouped={grouped}>
        {children}
      </NotesLayout>
    </div>
  );
}
