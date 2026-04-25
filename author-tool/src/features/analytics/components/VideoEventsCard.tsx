import type { VideoEventsData } from '../types/analytics.types';

function surfaceBadge(surface: string) {
  if (surface === '문제풀이') return 'bg-rose-100 text-rose-700';
  if (surface === '요약노트') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

export default function VideoEventsCard({ data }: { data: VideoEventsData }) {
  const surfaces = data.bySurface.length > 0 ? data.bySurface : [];
  const topVideos = data.topVideos.slice(0, 8);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold">▶️ YouTube 이벤트</h3>
        <span className="text-[10px] text-gray-400">video_play · video_complete</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-rose-50 rounded-lg p-3">
          <div className="text-[11px] text-rose-700 font-semibold">재생 (play)</div>
          <div className="text-xl font-extrabold text-rose-700">
            {data.play.toLocaleString()}
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="text-[11px] text-emerald-700 font-semibold">완주 (complete)</div>
          <div className="text-xl font-extrabold text-emerald-700">
            {data.complete.toLocaleString()}
          </div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3">
          <div className="text-[11px] text-indigo-700 font-semibold">완주율</div>
          <div className="text-xl font-extrabold text-indigo-700">
            {data.completionRate}%
          </div>
        </div>
      </div>

      {surfaces.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] text-gray-500 font-semibold mb-1.5">영역별 분포</div>
          <div className="space-y-1">
            {surfaces.map((s, i) => {
              const rate = s.play > 0 ? Math.round((s.complete / s.play) * 1000) / 10 : 0;
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${surfaceBadge(s.surface)}`}>
                    {s.surface}
                  </span>
                  <span className="flex-1 text-gray-500 text-xs">
                    재생 {s.play.toLocaleString()} · 완주 {s.complete.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-gray-700">{rate}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topVideos.length > 0 ? (
        <div>
          <div className="text-[11px] text-gray-500 font-semibold mb-1.5">인기 영상 TOP {topVideos.length}</div>
          <div className="space-y-1">
            {topVideos.map((v, i) => (
              <div key={v.videoId} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="flex-1 truncate text-gray-700">{v.title || v.videoId}</span>
                <span className="text-rose-600 tabular-nums">{v.play.toLocaleString()}</span>
                <span className="text-gray-300">/</span>
                <span className="text-emerald-600 tabular-nums">{v.complete.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            ※ 영상 제목/영역별 통계는 GA4에 커스텀 디멘션(video_id, video_title, surface) 등록 후 수집됩니다.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400">
          영상별 통계는 GA4 커스텀 디멘션(video_id, surface) 등록 후 수집됩니다.
        </p>
      )}
    </div>
  );
}
