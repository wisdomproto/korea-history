import { useEffect, useState } from 'react';

interface ReminderActive {
  id: string;
  fromDate: string;
  toDate: string;
  severity: 'info' | 'warning' | 'urgent';
  icon: string;
  title: string;
  description: string;
  cta?: { label: string; href: string };
  dayOfWindow: number;
  daysRemaining: number;
}

const SEVERITY_STYLE: Record<string, string> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  urgent: 'bg-rose-50 border-rose-300 text-rose-900',
};
const SEVERITY_BADGE: Record<string, string> = {
  info: 'bg-sky-100 text-sky-700',
  warning: 'bg-amber-100 text-amber-800',
  urgent: 'bg-rose-200 text-rose-800',
};
const STORAGE_KEY = 'gcnote.reminders.dismissed';

function loadDismissed(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveDismissed(map: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Date-based reminder banner — shows active reminders from
 * /api/reminders. Dismissed state is per-toDate (re-shows if reminder
 * has the same id but a new toDate, e.g. recurring monthly).
 */
export function ReminderBanner() {
  const [reminders, setReminders] = useState<ReminderActive[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, string>>(loadDismissed);

  useEffect(() => {
    fetch('/api/reminders')
      .then((r) => r.json())
      .then((data) => setReminders(data.active ?? []))
      .catch((err) => console.warn('[reminder] fetch failed:', err));
  }, []);

  const visible = reminders.filter((r) => dismissed[r.id] !== r.toDate);
  if (visible.length === 0) return null;

  const dismiss = (r: ReminderActive) => {
    const next = { ...dismissed, [r.id]: r.toDate };
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="space-y-2 mb-3">
      {visible.map((r) => (
        <div
          key={r.id}
          className={`rounded-xl border p-3 flex items-start gap-3 ${SEVERITY_STYLE[r.severity]}`}
        >
          <div className="text-2xl leading-none mt-0.5">{r.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-[13px]">{r.title}</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${SEVERITY_BADGE[r.severity]}`}
              >
                {r.severity.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                D{r.daysRemaining > 0 ? `-${r.daysRemaining}` : 'AY'}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed">{r.description}</p>
            {r.cta && (
              <a
                href={r.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1.5 text-[11px] font-bold underline hover:no-underline"
              >
                {r.cta.label} →
              </a>
            )}
          </div>
          <button
            onClick={() => dismiss(r)}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5 px-1"
            title="이 알람 닫기"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
