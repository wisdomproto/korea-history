// Client-side exam history — localStorage

export interface ExamRecord {
  examNumber: number;
  score: number; // correct count
  total: number; // answered count
  percentage: number;
  grade: string; // 1급, 2급, 3급, 불합격
  wrongByEra: Record<string, number>;
  date: string; // ISO
}

const STORAGE_KEY = "exam-history";

export function getExamHistory(): ExamRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExamRecord(record: Omit<ExamRecord, "date" | "grade">): void {
  if (typeof window === "undefined") return;
  const history = getExamHistory();

  const grade = getGrade(record.percentage);

  // Replace if same exam exists, otherwise add
  const existing = history.findIndex((r) => r.examNumber === record.examNumber);
  const entry: ExamRecord = {
    ...record,
    grade,
    date: new Date().toISOString(),
  };

  if (existing >= 0) {
    history[existing] = entry;
  } else {
    history.push(entry);
  }

  // Sort by date desc
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getGrade(percentage: number): string {
  // 한국사능력검정시험 심화 기준
  if (percentage >= 80) return "1급";
  if (percentage >= 70) return "2급";
  if (percentage >= 60) return "3급";
  return "불합격";
}

export function getGradeColor(grade: string): { bg: string; text: string; border: string } {
  switch (grade) {
    case "1급": return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "2급": return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "3급": return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    default: return { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" };
  }
}
