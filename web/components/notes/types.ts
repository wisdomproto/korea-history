/**
 * Generic 노트/단원 데이터 모델 — 한능검·단권화·자동 가이드 모두 공유.
 */

export interface NoteListItem {
  /** Unique key — sectionId 또는 topicId */
  id: string;
  /** 순서 번호 (사이드바·카드에 표시) */
  ord?: number;
  title: string;
  /** 클릭 시 이동할 URL */
  href: string;
  /** 출제빈도·매칭문제 등 우측 작은 라벨 */
  badge?: string;
  /** 메타 정보 (부가 텍스트, 카드용) */
  meta?: string;
  /** 키워드 태그 (카드용, 사이드바엔 미표시) */
  keywords?: string[];
  /** 핵심 카운트 (출제 N회 같은) — 사이드바에 표시 */
  freqCount?: number;
  /** 매칭 문제 수 (카드용) */
  questionCount?: number;
  /** 글자 수 (카드용) */
  charCount?: number;
}

export interface NoteGroup {
  /** 그룹 key (s1, g1 등) */
  key: string;
  /** "선사·고조선" 또는 "단원 1~5" */
  label: string;
  items: NoteListItem[];
  /** Tailwind 색상 클래스 (border-l-violet-500 등) */
  colorClass?: string;
  /** 서브타이틀 (선택) */
  sublabel?: string;
}

export interface NotesShellMeta {
  /** Hero eyebrow 텍스트 ("Auto Summary Note · 9급 검찰") */
  eyebrow: string;
  /** Hero h1 (앞부분) */
  titleLead?: string;
  /** Hero h1 (뒷부분, amber 강조) */
  titleAccent: string;
  /** 부제 (단원 N · 자동 분류 등) */
  subtitle?: string;
  /** 검색 placeholder */
  searchPlaceholder?: string;
  /** 좌측 빠른 액션 (기출 풀기 같은) */
  quickActions?: Array<{ label: string; href: string; primary?: boolean }>;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
