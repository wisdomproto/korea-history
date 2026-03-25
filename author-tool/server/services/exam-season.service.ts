export interface SeasonPreset {
  id: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

// 2026 exam schedule — update annually
const EXAM_SCHEDULE = [
  { id: 77, date: '2026-02-08', name: '제77회' },
  { id: 78, date: '2026-05-23', name: '제78회' },
  { id: 79, date: '2026-08-09', name: '제79회' },
  { id: 80, date: '2026-10-17', name: '제80회' },
  { id: 81, date: '2026-11-28', name: '제81회' },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Returns season presets (D-14 ~ D+7) for each exam */
export function getSeasonPresets(): SeasonPreset[] {
  return EXAM_SCHEDULE.map((exam) => ({
    id: exam.id,
    name: `${exam.id}회 시즌`,
    startDate: addDays(exam.date, -14),
    endDate: addDays(exam.date, 7),
  }));
}

/** Returns standard date presets */
export function getDatePresets(): Array<{ id: string; name: string; startDate: string; endDate: string }> {
  const today = new Date().toISOString().split('T')[0];
  return [
    { id: 'today', name: '오늘', startDate: today, endDate: today },
    { id: '7d', name: '7일', startDate: addDays(today, -6), endDate: today },
    { id: '30d', name: '30일', startDate: addDays(today, -29), endDate: today },
    { id: '90d', name: '90일', startDate: addDays(today, -89), endDate: today },
  ];
}
