import { Metadata } from "next";
import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesHome from "./NotesHome";

export const metadata: Metadata = {
  title: "한능검 요약노트 — 시대별 87편 무료 | 한국사 요약",
  description:
    "기출노트가 만든 한능검 요약노트. 한국사능력검정시험 시대별 핵심 정리 87편을 무료로. 선사·고조선부터 현대까지 인물·사건·제도 핵심 키워드 모두 정리. 최태성 영상강의 연동.",
  keywords: [
    "한능검 요약노트", "한능검 요약", "한국사 요약노트", "한국사 요약",
    "한국사능력검정시험 요약", "한능검 정리", "한능검 시대별 정리",
    "기출노트", "기출노트 한능검", "한국사 정리", "한능검 무료",
  ],
  alternates: { canonical: "/notes" },
  openGraph: {
    title: "한능검 요약노트 — 시대별 87편 무료",
    description: "기출노트가 만든 한능검 요약노트. 한국사능력검정시험 시대별 핵심 정리 87편을 무료로.",
    url: "/notes",
    type: "website",
    siteName: "기출노트 한능검",
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gcnote.co.kr";

export default function NotesPage() {
  const notes = getNotesIndex();
  const grouped = getNotesGroupedBySection();

  // ItemList JSON-LD — 87 notes as a structured collection (rich result eligibility)
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "한능검 요약노트 — 시대별 87편",
    description: "한국사능력검정시험 시대별 요약노트 컬렉션. 선사·고조선부터 현대까지 87개 핵심 주제.",
    numberOfItems: notes.length,
    itemListElement: notes.slice(0, 50).map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/notes/${n.id}`,
      name: n.title,
    })),
    publisher: {
      "@type": "Organization",
      name: "기출노트",
      url: SITE_URL,
    },
  };

  // CollectionPage JSON-LD — entity signal for /notes as a hub
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "한능검 요약노트",
    headline: "한능검 요약노트 — 시대별 87편 무료",
    description: "기출노트가 만든 한국사능력검정시험 시대별 요약노트 87편. 선사·고조선부터 현대까지 모든 시대 정리.",
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    about: [
      { "@type": "Thing", name: "한국사능력검정시험" },
      { "@type": "Thing", name: "한능검 요약" },
      { "@type": "Thing", name: "한국사 요약" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <section className="mb-6 rounded-2xl border border-emerald-100 bg-white p-5 card-shadow text-[13px] leading-[1.75] text-slate-600 space-y-2.5">
        <p>
          <strong>한능검 요약노트</strong>는 <strong>기출노트</strong>가 만든 <strong>한국사능력검정시험 무료 학습 자료</strong>입니다.
          출제 범위를 <strong>7개 대단원 {notes.length}개 시대별 주제</strong>로 나누어 핵심 개념을 정리한 시험 대비 자료로,
          선사·고조선부터 일제 강점기·현대까지 정치·경제·사회·문화 영역의 주요 사건·제도·인물·유물을 한눈에 연결해 볼 수 있습니다.
          <strong> 평생 무료</strong>이며, 별도 가입 없이 바로 시작할 수 있습니다.
        </p>
        <p>
          각 <strong>한능검 요약</strong>은 <strong>시험 출제 포인트를 중심으로</strong> 작성되어 암기에 부담이 없는 분량으로 구성되어 있고,
          관련 기출문제 수가 함께 표기되어 있어 해당 시대에서 얼마나 자주 출제되는지 한눈에 파악할 수 있습니다.
          노트를 열면 &lsquo;관련 기출 풀기&rsquo; 버튼으로 해당 주제 문제만 묶어 학습 세션을 시작할 수 있고,
          최태성 강사의 해당 시대 영상 강의가 임베드되어 있어 텍스트 학습과 영상 학습을 병행할 수 있습니다.
        </p>
        <p>
          <strong>시대별 정리</strong>가 필요하다면 <strong>1단원 선사·고조선</strong>부터 순서대로, 시험 직전 최종 점검이라면
          자주 틀리는 시대만 골라 학습하는 방식을 추천합니다. 노트 검색창에서 &lsquo;<strong>병자호란</strong>&rsquo; &lsquo;<strong>훈민정음</strong>&rsquo;
          &lsquo;<strong>대동법</strong>&rsquo; &lsquo;<strong>경국대전</strong>&rsquo; &lsquo;<strong>6월민주항쟁</strong>&rsquo;처럼
          핵심 키워드로 바로 찾을 수도 있습니다. 한국사 요약노트로 한능검 1급·2급·3급 모두 무료 대비.
        </p>
      </section>
      <NotesHome notes={notes} grouped={grouped} />
    </>
  );
}
