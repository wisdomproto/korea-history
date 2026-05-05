import { useEffect, useState } from 'react';
import type { PWAFunnelData } from '../types/analytics.types';
import { fetchPWAEvents } from '../api/analytics.api';

const ENV_LABEL: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
  inapp: '인앱 브라우저',
  desktop: '데스크톱',
  unknown: 'unknown',
  '기타': '기타',
};

function envBadge(env: string): string {
  if (env === 'android') return 'bg-emerald-100 text-emerald-700';
  if (env === 'ios') return 'bg-blue-100 text-blue-700';
  if (env === 'inapp') return 'bg-rose-100 text-rose-700';
  if (env === 'desktop') return 'bg-slate-100 text-slate-700';
  return 'bg-gray-100 text-gray-600';
}

export default function PWAEventsCard({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<PWAFunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPWAEvents(start, end)
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [start, end]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-extrabold mb-3">📱 홈 화면 추가 (PWA)</h3>
        <div className="text-xs text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-extrabold mb-3">📱 홈 화면 추가 (PWA)</h3>
        <div className="text-xs text-gray-400">GA4 미연결</div>
      </div>
    );
  }

  const { totals, byEnv, daily, androidConversionRate, installConversionRate } = data;
  const noData = totals.clicked === 0 && totals.appInstalled === 0;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold">📱 홈 화면 추가 (PWA)</h3>
        <span className="text-[10px] text-gray-400">install 퍼널</span>
      </div>

      {noData ? (
        <p className="text-[12px] text-gray-500 leading-relaxed">
          PWA install 이벤트가 아직 수집되지 않았습니다. 사용자가 헤더의 amber{' '}
          <code className="px-1 bg-amber-50 text-amber-700 rounded">홈 화면에 추가</code>{' '}
          버튼을 클릭하면 데이터가 쌓이기 시작합니다 (GA4 실시간 ≤1분, 전체 보고 ≤24h).
        </p>
      ) : (
        <>
          {/* Funnel 4 step */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <FunnelMetric
              label="버튼 클릭"
              value={totals.clicked}
              tone="amber"
            />
            <FunnelMetric
              label="모달 노출"
              value={totals.modalOpened}
              tone="orange"
              sub="iOS·인앱·데스크톱"
            />
            <FunnelMetric
              label="Android 수락"
              value={totals.accepted}
              tone="emerald"
              sub={
                totals.clicked > 0
                  ? `${androidConversionRate}% / 클릭`
                  : undefined
              }
            />
            <FunnelMetric
              label="실제 설치"
              value={totals.appInstalled}
              tone="indigo"
              sub={
                totals.clicked > 0
                  ? `${installConversionRate}% / 클릭`
                  : undefined
              }
            />
          </div>

          {/* dismiss / already-installed 보조 통계 */}
          {(totals.dismissed > 0 || totals.alreadyInstalledDismissed > 0) && (
            <div className="flex gap-3 text-[11px] text-gray-500 mb-4">
              {totals.dismissed > 0 && (
                <span>
                  거부 <strong className="text-gray-700">{totals.dismissed}</strong>
                </span>
              )}
              {totals.alreadyInstalledDismissed > 0 && (
                <span>
                  &ldquo;이미 설치&rdquo;{' '}
                  <strong className="text-gray-700">
                    {totals.alreadyInstalledDismissed}
                  </strong>
                </span>
              )}
            </div>
          )}

          {/* env breakdown */}
          {byEnv.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] text-gray-500 font-semibold mb-1.5">
                환경별 분포
              </div>
              <div className="space-y-1">
                {byEnv.map((e) => (
                  <div key={e.env} className="flex items-center gap-2 text-sm">
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${envBadge(e.env)}`}
                    >
                      {ENV_LABEL[e.env] ?? e.env}
                    </span>
                    <span className="flex-1 text-gray-500 text-xs">
                      클릭 {e.clicks.toLocaleString()}
                      {e.accepted > 0 && ` · 수락 ${e.accepted.toLocaleString()}`}
                      {e.appInstalled > 0 &&
                        ` · 설치 ${e.appInstalled.toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>
              {byEnv.every((e) => e.env === '기타') && (
                <p className="text-[10px] text-gray-400 mt-2">
                  ※ 환경(android/ios/desktop)별 분리는 GA4 커스텀 디멘션{' '}
                  <code>env</code> 등록 후 24~48h 내 표시됩니다.
                </p>
              )}
            </div>
          )}

          {/* daily sparkline */}
          {daily.length > 0 && (
            <div>
              <div className="text-[11px] text-gray-500 font-semibold mb-1.5">
                일별 추이 ({daily.length}일)
              </div>
              <div className="space-y-0.5">
                {daily.slice(-7).map((d) => (
                  <div
                    key={d.date}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span className="text-gray-400 font-mono w-20">
                      {d.date.slice(5)}
                    </span>
                    <span className="text-amber-700 tabular-nums w-12 text-right">
                      {d.clicked}
                    </span>
                    <span className="text-gray-300">/</span>
                    <span className="text-indigo-600 tabular-nums w-12">
                      {d.appInstalled}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      클릭/설치
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FunnelMetric({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'orange' | 'emerald' | 'indigo';
  sub?: string;
}) {
  const bg =
    tone === 'amber'
      ? 'bg-amber-50'
      : tone === 'orange'
      ? 'bg-orange-50'
      : tone === 'emerald'
      ? 'bg-emerald-50'
      : 'bg-indigo-50';
  const fg =
    tone === 'amber'
      ? 'text-amber-700'
      : tone === 'orange'
      ? 'text-orange-700'
      : tone === 'emerald'
      ? 'text-emerald-700'
      : 'text-indigo-700';
  return (
    <div className={`${bg} rounded-lg p-3`}>
      <div className={`text-[11px] ${fg} font-semibold`}>{label}</div>
      <div className={`text-xl font-extrabold ${fg}`}>
        {value.toLocaleString()}
      </div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}
