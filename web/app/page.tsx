import { Metadata } from "next";
import KoreanHistoryLanding from "@/components/KoreanHistoryLanding";
import OtherExamsSection from "@/components/OtherExamsSection";
import CivilNotesSection from "@/components/CivilNotesSection";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function HomePage() {
  return (
    <>
      <KoreanHistoryLanding />
      <CivilNotesSection />
      <OtherExamsSection currentExamId="korean-history" />
    </>
  );
}
