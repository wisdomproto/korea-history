import { useInstagramSnapshot } from '../hooks/useChannelAnalytics';
import type { InstagramMediaWithInsights } from '../types';

function fmt(n: number | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

const METRIC_LABELS: Record<string, string> = {
  reach: '도달',
  impressions: '노출',
  profile_views: '프로필 조회',
  accounts_engaged: '참여 계정',
  follower_count: '팔로워 변화',
};

export function InstagramTab() {
  const { data, isLoading, error } = useInstagramSnapshot();

  if (isLoading) return <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />;
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        Instagram 데이터 로딩 실패: {(error as Error).message}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-1">
        <p className="font-bold">⚠️ Instagram 미설정</p>
        <p>
          .env의 <code className="bg-amber-100 px-1 rounded">INSTAGRAM_USER_ID</code> +
          <code className="bg-amber-100 px-1 rounded">INSTAGRAM_ACCESS_TOKEN</code>이 필요합니다.
        </p>
      </div>
    );
  }

  const acc = data.account;

  return (
    <div className="space-y-5">
      {/* Account header */}
      {acc && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          {acc.profilePictureUrl && (
            <img
              src={acc.profilePictureUrl}
              alt={acc.username}
              className="w-14 h-14 rounded-full"
            />
          )}
          <div className="flex-1">
            <h3 className="text-base font-bold">{acc.name ?? acc.username}</h3>
            <p className="text-xs text-gray-500">@{acc.username}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="팔로워" value={fmt(acc.followersCount)} accent />
            <Stat label="팔로잉" value={fmt(acc.followsCount)} />
            <Stat label="게시물" value={fmt(acc.mediaCount)} />
          </div>
        </div>
      )}

      {/* Account insights */}
      {data.insights.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">최근 14일 활동</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.insights.map((m) => (
              <div key={m.metric} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="text-[10px] text-gray-500 font-bold uppercase">
                  {METRIC_LABELS[m.metric] ?? m.metric}
                </div>
                <div className="text-xl font-extrabold mt-1">{m.total.toLocaleString()}</div>
                {m.values.length > 1 && <Sparkline values={m.values.map((v) => v.value)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media table */}
      <div>
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
          최근 게시물 ({data.media.length})
        </h4>
        {data.media.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">게시물이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {data.media.map((m) => (
              <MediaCard key={m.id} media={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaCard({ media }: { media: InstagramMediaWithInsights }) {
  const i = media.insights;
  const rate = i.reach && i.likes != null
    ? +(((i.likes ?? 0) + (i.comments ?? 0) + (i.saves ?? 0) + (i.shares ?? 0)) / i.reach * 100).toFixed(1)
    : 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3">
      {media.thumbnailUrl ? (
        <img src={media.thumbnailUrl} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
          📸
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase text-rose-600">{media.mediaType}</span>
          <span className="text-[10px] text-gray-400">{fmtDate(media.timestamp)}</span>
          {media.permalink && (
            <a
              href={media.permalink}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-[10px] text-blue-600 hover:underline"
            >
              ↗
            </a>
          )}
        </div>
        <p className="text-xs text-gray-700 line-clamp-2 mb-2">
          {media.caption?.slice(0, 120) || '(캡션 없음)'}
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 text-[10px]">
          <Metric label="도달" value={fmt(i.reach)} />
          <Metric label="노출" value={fmt(i.impressions ?? i.plays)} />
          <Metric label="좋아요" value={fmt(i.likes)} />
          <Metric label="댓글" value={fmt(i.comments)} />
          <Metric label="저장" value={fmt(i.saves)} />
          <Metric label="공유" value={fmt(i.shares)} />
        </div>
        {rate > 0 && (
          <div className="mt-1 text-[10px] text-emerald-600 font-bold">참여율 {rate}%</div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-gray-400">{label}</div>
      <div className="font-bold text-gray-700 tabular-nums">{value}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-xl font-extrabold ${accent ? 'text-rose-600' : ''}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-px h-6 mt-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-rose-200 rounded-sm"
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
          title={String(v)}
        />
      ))}
    </div>
  );
}
