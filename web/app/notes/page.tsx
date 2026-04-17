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

  return (
    <>
      <section className="mb-6 rounded-2xl border border-emerald-100 bg-white p-5 card-shadow text-[13px] leading-[1.75] text-slate-600 space-y-2.5">
        <p>
          한능검 요약노트는 한국사능력검정시험 출제 범위를 <strong>7개 대단원 {notes.length}개 주제</strong>로
          나누어 핵심 개념을 정리한 시험 대비 자료입니다. 선사·고조선 시대부터 일제 강점기·현대까지 시대 흐름을
          따라가며 정치·경제·사회·문화 영역의 주요 사건과 제도, 인물, 유물·유적을 한눈에 연결해 볼 수 있습니다.
        </p>
        <p>
          각 노트는 <strong>시험 출제 포인트를 중심으로</strong> 작성되어 암기에 부담이 없는 분량으로 구성되어 있고,
          관련 기출문제 수가 함께 표기되어 있어 해당 시대에서 얼마나 자주 출제되는지 한눈에 파악할 수 있습니다.
          노트를 열면 &lsquo;관련 기출 풀기&rsquo; 버튼으로 해당 주제 문제만 묶어 학습 세션을 시작할 수 있고,
          최태성 강사의 해당 시대 영상 강의가 임베드되어 있어 텍스트 학습과 영상 학습을 병행할 수 있습니다.
        </p>
        <p>
          처음 공부를 시작한다면 <strong>1단원 선사·고조선</strong>부터 순서대로, 시험 직전 최종 점검이라면
          자주 틀리는 시대만 골라 학습하는 방식을 추천합니다. 노트 검색창에서 &lsquo;묘청&rsquo; &lsquo;탕평책&rsquo; &lsquo;물산장려운동&rsquo;
          처럼 키워드로 바로 찾을 수도 있습니다.
        </p>
      </section>
      <NotesHome notes={notes} grouped={grouped} />
    </>
  );
}
