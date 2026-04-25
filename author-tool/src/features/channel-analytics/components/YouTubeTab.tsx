import { useEditorStore } from '@/store/editor.store';
import { useYoutubeSnapshot } from '../hooks/useChannelAnalytics';

function fmtDuration(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const h = Number(m[1] ?? 0);
  const mi = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  if (h > 0) return `${h}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${mi}:${String(s).padStart(2, '0')}`;
}

export function YouTubeTab() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data, isLoading, error } = useYoutubeSnapshot(projectId);

  if (isLoading) return <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />;
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        YouTube 데이터 로딩 실패: {(error as Error).message}
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-1">
        <p className="font-bold">⚠️ YouTube 채널 미연결</p>
        <p>{data?.message ?? '연결 정보를 확인해주세요.'}</p>
        <ol className="list-decimal pl-4 pt-1 space-y-0.5 text-amber-700">
          <li>.env에 <code className="bg-amber-100 px-1 rounded">YOUTUBE_API_KEY</code> 추가</li>
          <li>프로젝트 설정 → API·연동 → YouTube 채널 ID 또는 핸들 입력 (이번 업데이트에서 추가 예정)</li>
          <li>새로고침</li>
        </ol>
      </div>
    );
  }

  const { channel, videos } = data.data;

  return (
    <div className="space-y-5">
      {channel && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          {channel.thumbnailUrl && <img src={channel.thumbnailUrl} className="w-14 h-14 rounded-full" />}
          <div className="flex-1">
            <h3 className="text-base font-bold">{channel.title}</h3>
            <p className="text-xs text-gray-500 line-clamp-1">{channel.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-extrabold text-red-600">{channel.subscriberCount.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">구독자</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">{channel.viewCount.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">총 조회수</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">{channel.videoCount.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">영상</div>
            </div>
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
            최근 영상 ({videos.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {videos.map((v) => (
              <a
                key={v.videoId}
                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-video relative bg-gray-100">
                  {v.thumbnailUrl && (
                    <img src={v.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {v.duration && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {fmtDuration(v.duration)}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <h5 className="text-xs font-bold line-clamp-2">{v.title}</h5>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>👁 {v.viewCount.toLocaleString()}</span>
                    <span>👍 {v.likeCount.toLocaleString()}</span>
                    <span>💬 {v.commentCount.toLocaleString()}</span>
                    <span className="ml-auto">{new Date(v.publishedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
