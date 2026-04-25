import { Metadata } from "next";
import KoreanHistoryLanding from "@/components/KoreanHistoryLanding";
import OtherExamsSection from "@/components/OtherExamsSection";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function HomePage() {
  return (
    <>
      <KoreanHistoryLanding />
      <OtherExamsSection currentExamId="korean-history" />
    </>
  );
}
