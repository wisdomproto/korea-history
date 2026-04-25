import type { SearchKeywordData } from '../types/analytics.types';

function sourceBadge(source: string) {
  if (source.includes('google')) return 'bg-blue-100 text-blue-700';
  if (source.includes('naver')) return 'bg-green-100 text-green-700';
  if (source.includes('daum') || source.includes('kakao')) return 'bg-yellow-100 text-yellow-700';
  if (source.includes('bing')) return 'bg-cyan-100 text-cyan-700';
  return 'bg-gray-100 text-gray-600';
}

export default function SearchKeywordsTable({ data }: { data: SearchKeywordData[] }) {
  const items = data.slice(0, 20);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold">🔎 유입 검색어</h3>
        <span className="text-[10px] text-gray-400">sessionManualTerm</span>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-gray-500 space-y-2">
          <p>수집된 검색어가 없습니다.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 leading-relaxed">
            <p className="font-semibold mb-1">ℹ️ 유기적 검색어 수집 방법</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Google: 대부분 "(not provided)"로 비공개 — Search Console 연동 필요</li>
              <li>Naver: 검색어 referrer가 GA4에 일부만 전달됨</li>
              <li>UTM <code className="bg-amber-100 px-1 rounded">?utm_term=</code> 파라미터가 있을 때 여기 수집됨</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((k, i) => (
            <div key={`${k.term}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="text-gray-300 w-5 text-right text-xs">{i + 1}</span>
              <span
                className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${sourceBadge(k.source)}`}
              >
                {k.source}
              </span>
              <span className="flex-1 truncate text-gray-700">{k.term}</span>
              <span className="text-xs text-gray-400">{k.users.toLocaleString()}명</span>
              <span className="font-bold tabular-nums w-12 text-right">
                {k.sessions.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
