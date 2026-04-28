import NotesShell from "@/components/notes/NotesShell";
import type { NoteGroup, NoteListItem, NotesShellMeta, BreadcrumbItem } from "@/components/notes/types";

interface Topic {
  topicId: string;
  ord: number;
  title: string;
  keywords: string[];
  freq: number;
  chars: number;
  questionCount: number;
}

interface Props {
  examLabel: string;
  examMain: string;
  subjectLabel: string;
  subjectSlug: string;
  noteSlug: string | null;
  topics: Topic[];
  mode: "manual" | "auto";
  stem?: string;
  meta: {
    totalTopics: number;
    chars?: number;
    totalQ?: number;
    subtitle: string;
  };
}

const GROUP_COLORS = [
  "border-l-violet-500",
  "border-l-blue-500",
  "border-l-cyan-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-orange-500",
  "border-l-red-500",
  "border-l-pink-500",
  "border-l-purple-500",
  "border-l-teal-500",
];

/**
 * 단권화 노트 인덱스 — generic NotesShell로 통합 (한능검과 동일 컴포넌트).
 */
export default function CivilNotesHome({
  examLabel,
  examMain,
  subjectLabel,
  subjectSlug,
  noteSlug,
  topics,
  mode,
  meta,
}: Props) {
  // topics → NoteListItem[]
  const items: NoteListItem[] = topics.map((t) => ({
    id: t.topicId,
    ord: t.ord,
    title: t.title,
    href: noteSlug ? `/civil-notes/${noteSlug}/${t.topicId}` : `#topic-${t.topicId}`,
    keywords: t.keywords,
    freqCount: t.freq,
    questionCount: t.questionCount,
    charCount: t.chars,
    meta: [
      t.freq > 0 ? `📊 출제 ${t.freq}회` : null,
      t.questionCount > 0 ? `📝 매칭 ${t.questionCount}문제` : null,
      t.chars > 0 ? `📄 ${Math.round(t.chars / 100) * 100}자` : null,
    ]
      .filter(Boolean)
      .join("  ·  "),
  }));

  // 5개씩 그룹핑
  const groupSize = 5;
  const groups: NoteGroup[] = [];
  for (let i = 0; i < items.length; i += groupSize) {
    const groupNum = Math.floor(i / groupSize) + 1;
    const startOrd = i + 1;
    const endOrd = Math.min(i + groupSize, items.length);
    groups.push({
      key: `g${groupNum}`,
      label: `단원 ${startOrd}~${endOrd}`,
      items: items.slice(i, i + groupSize),
      colorClass: GROUP_COLORS[(groupNum - 1) % GROUP_COLORS.length],
    });
  }

  const shellMeta: NotesShellMeta = {
    eyebrow: `${mode === "manual" ? "Auto Summary Note" : "Auto Study Guide"} · ${examLabel}`,
    titleLead: subjectLabel,
    titleAccent: "요약노트",
    subtitle: `${meta.subtitle} · ${meta.totalTopics}단원${meta.chars ? ` · 약 ${Math.round(meta.chars / 100) * 100}자` : ""}${meta.totalQ ? ` · ${meta.totalQ}문제 매칭` : ""}`,
    searchPlaceholder: `${meta.totalTopics}단원 검색...`,
    quickActions: [
      {
        label: `📝 ${subjectLabel} 기출 풀기`,
        href: `${examMain}/${subjectSlug}/exam`,
        primary: true,
      },
      { label: `← ${examLabel} 메인`, href: examMain },
    ],
  };

  const breadcrumb: BreadcrumbItem[] = [
    { label: "홈", href: "/" },
    { label: examLabel, href: examMain },
    { label: `${subjectLabel} 요약노트` },
  ];

  return <NotesShell meta={shellMeta} groups={groups} breadcrumb={breadcrumb} />;
}
