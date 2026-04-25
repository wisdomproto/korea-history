import { useSearchConsole, useGscSetup } from '../hooks/useAnalytics';
import type { DateRange } from '../types/analytics.types';

export default function SearchConsoleCard({ range }: { range: DateRange }) {
  const { data, isLoading, error } = useSearchConsole(range.startDate, range.endDate);
  const { data: setup } = useGscSetup();

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold">🔍 Google Search Console (실제 검색어)</h3>
        <span className="text-[10px] text-gray-400">GSC API · 3일 지연</span>
      </div>

      {isLoading ? (
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
      ) : error ? (
        <p className="text-xs text-red-600">불러오기 실패: {(error as Error).message}</p>
      ) : !data ? (
        <div className="text-xs text-gray-600 space-y-2">
          <p>Search Console 데이터를 불러올 수 없습니다.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-900 leading-relaxed space-y-2">
            <p className="font-semibold">🛠 연동 체크리스트</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                <strong>Search Console API 활성화</strong> →{' '}
                <a
                  href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  Google Cloud Console
                </a>{' '}
                에서 서비스 계정의 프로젝트에 대해 "Search Console API" 사용 설정
              </li>
              <li>
                <strong>Search Console에 서비스 계정 추가</strong> →{' '}
                <a
                  href="https://search.google.com/search-console/users"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  Search Console 사용자 관리
                </a>{' '}
                → 사용자 추가 → 아래 이메일 입력, 권한 "소유자" 또는 "전체"
              </li>
              {setup?.serviceAccountEmail && (
                <div className="bg-white border border-blue-300 rounded px-2 py-1.5 font-mono text-[11px] break-all select-all">
                  {setup.serviceAccountEmail}
                </div>
              )}
              <li>
                .env의{' '}
                <code className="bg-blue-100 px-1 rounded">GSC_SITE_URL</code> 확인 (현재:{' '}
                <code className="bg-blue-100 px-1 rounded">{setup?.siteUrl ?? 'sc-domain:gcnote.co.kr'}</code>)
              </li>
              <li>새로고침 (최대 5분 전파 지연)</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-lg p-2.5">
              <div className="text-[10px] text-blue-700 font-semibold">클릭</div>
              <div className="text-lg font-extrabold text-blue-700">
                {data.totals.clicks.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2.5">
              <div className="text-[10px] text-purple-700 font-semibold">노출</div>
              <div className="text-lg font-extrabold text-purple-700">
                {data.totals.impressions.toLocaleString()}
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5">
              <div className="text-[10px] text-emerald-700 font-semibold">CTR</div>
              <div className="text-lg font-extrabold text-emerald-700">
                {data.totals.ctr}%
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5">
              <div className="text-[10px] text-amber-700 font-semibold">평균 순위</div>
              <div className="text-lg font-extrabold text-amber-700">
                {data.totals.position}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-gray-500 font-semibold mb-1.5">
              인기 검색어 TOP {Math.min(data.queries.length, 20)}
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {data.queries.slice(0, 20).map((q, i) => (
                <div key={`${q.query}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-300 w-5 text-right">{i + 1}</span>
                  <span className="flex-1 truncate text-gray-700">{q.query || '(empty)'}</span>
                  <span className="text-blue-600 tabular-nums w-10 text-right">
                    {q.clicks.toLocaleString()}
                  </span>
                  <span className="text-purple-600 tabular-nums w-12 text-right">
                    {q.impressions.toLocaleString()}
                  </span>
                  <span className="text-emerald-600 tabular-nums w-12 text-right">
                    {q.ctr}%
                  </span>
                  <span className="text-amber-600 tabular-nums w-10 text-right">
                    #{q.position}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1.5 px-2">
              <span className="w-5 text-right">#</span>
              <span className="flex-1">검색어</span>
              <span className="w-10 text-right">클릭</span>
              <span className="w-12 text-right">노출</span>
              <span className="w-12 text-right">CTR</span>
              <span className="w-10 text-right">순위</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
