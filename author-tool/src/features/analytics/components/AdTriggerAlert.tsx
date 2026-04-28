import { useEffect, useState, useCallback } from 'react';

interface TriggerEntry {
  triggered: boolean;
  reachedAt: string | null;
}
interface AdTriggerState {
  daily500: TriggerEntry & { latestDau: number };
  fourWeeks: TriggerEntry & { targetDate: string };
  adsenseApproved: TriggerEntry;
  lastChecked: string;
}

const DAU_THRESHOLD = 500;

export default function AdTriggerAlert() {
  const [state, setState] = useState<AdTriggerState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/ad-triggers');
      const json = await res.json();
      if (json.success) setState(json.data as AdTriggerState);
    } catch {}
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recheck = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/analytics/ad-triggers/check', { method: 'POST' });
      const json = await res.json();
      if (json.success) setState(json.data as AdTriggerState);
    } finally { setBusy(false); }
  }, []);

  const toggleAdsense = useCallback(async (approved: boolean) => {
    setBusy(true);
    try {
      const res = await fetch('/api/analytics/ad-triggers/adsense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      const json = await res.json();
      if (json.success) setState(json.data as AdTriggerState);
    } finally { setBusy(false); }
  }, []);

  if (!state) return null;

  const firedCount = [state.daily500, state.fourWeeks, state.adsenseApproved]
    .filter((t) => t.triggered).length;

  if (firedCount === 0) {
    const dauPct = Math.min(100, Math.round((state.daily500.latestDau / DAU_THRESHOLD) * 100));
    return (
      <details className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <summary className="cursor-pointer">📡 광고 확장 트리거 — 대기 중 (3/3)</summary>
        <div className="mt-2 space-y-1 pl-2">
          <div>① DAU 500 — 어제 {state.daily500.latestDau}명 ({dauPct}%)</div>
          <div>② 2026-05-26 도달 — 시간 트리거</div>
          <div>③ AdSense 통과 — <button onClick={() => toggleAdsense(true)} className="underline disabled:opacity-50" disabled={busy}>통과 표시</button></div>
        </div>
      </details>
    );
  }

  return (
    <div className="text-sm bg-amber-50 border-2 border-amber-400 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-amber-900 mb-1">
            🚨 광고 확장 검토 시점입니다 ({firedCount}/3 트리거 도달)
          </div>
          <ul className="text-xs text-amber-800 space-y-0.5 list-disc pl-5">
            {state.daily500.triggered && (
              <li>DAU 500 도달 ({state.daily500.reachedAt}, 최근 {state.daily500.latestDau}명)</li>
            )}
            {state.fourWeeks.triggered && (
              <li>4주 경과 — {state.fourWeeks.targetDate} 지남</li>
            )}
            {state.adsenseApproved.triggered && (
              <li>AdSense 심사 통과 ({state.adsenseApproved.reachedAt})</li>
            )}
          </ul>
          <div className="mt-2 text-xs text-amber-900">
            <span className="font-semibold">다음 단계 옵션:</span>{' '}
            ① leaderboard 추가 · ② 학습 종료 인터스티셜 · ③ PC AdSense 활성화
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={recheck}
            disabled={busy}
            className="text-[11px] px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 disabled:opacity-50"
          >
            재확인
          </button>
          {state.adsenseApproved.triggered && (
            <button
              onClick={() => toggleAdsense(false)}
              disabled={busy}
              className="text-[11px] px-2 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            >
              AdSense 해제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
