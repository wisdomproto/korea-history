import type { ChannelData, CampaignData } from '../types/analytics.types';

/**
 * PESO 모델 — Channel을 Owned / Earned / Paid 로 분류
 * v3 마케팅 전략 §04 참조.
 *
 * Owned: Direct (북마크/직접입력) — 우리가 100% 통제
 * Earned: Organic Search + Referral + Organic Social — 자생 트래픽
 * Paid: 광고 (현재 0, AdSense LIVE 후 채워짐)
 */

type Bucket = 'owned' | 'earned-search' | 'earned-community' | 'earned-social' | 'paid';

const BUCKET_META: Record<Bucket, { label: string; color: string; bg: string; icon: string; tag: string }> = {
  'owned':            { label: '🟢 Owned (북마크/직접)',     color: 'text-teal-700',   bg: 'bg-teal-100',   icon: '🟢', tag: 'Owned' },
  'earned-search':    { label: '🟡 Earned · 검색',           color: 'text-amber-700',  bg: 'bg-amber-100',  icon: '🟡', tag: 'Earned' },
  'earned-community': { label: '🟡 Earned · 커뮤니티',       color: 'text-orange-700', bg: 'bg-orange-100', icon: '🟡', tag: 'Earned' },
  'earned-social':    { label: '🟡 Earned · SNS',            color: 'text-purple-700', bg: 'bg-purple-100', icon: '🟡', tag: 'Earned' },
  'paid':             { label: '🔴 Paid (광고)',             color: 'text-rose-700',   bg: 'bg-rose-100',   icon: '🔴', tag: 'Paid' },
};

function classifyChannel(channel: string): Bucket {
  const c = channel.toLowerCase();
  if (c === 'direct') return 'owned';
  if (c.includes('paid')) return 'paid';
  if (c.includes('social')) return 'earned-social';
  if (c.includes('referral')) return 'earned-community';
  if (c.includes('organic search') || c.includes('search')) return 'earned-search';
  return 'earned-community';
}

function classifyCampaign(c: CampaignData): Bucket | null {
  // direct
  if (c.source === '(direct)') return 'owned';
  if (c.medium === 'cpc' || c.medium === 'paid') return 'paid';
  // SNS
  const sns = ['instagram', 'facebook', 'threads', 'l.instagram.com', 'l.facebook.com', 'instagram.com', 'm.facebook.com', 'ig'];
  if (sns.some(s => c.source.toLowerCase().includes(s))) return 'earned-social';
  // 검색 엔진 (organic)
  const search = ['naver', 'google', 'bing', 'yahoo', 'daum', 'duckduckgo'];
  if (c.medium === 'organic' && search.some(s => c.source.toLowerCase().startsWith(s))) return 'earned-search';
  // referral - 커뮤니티
  if (c.medium === 'referral') return 'earned-community';
  return null;
}

export default function ChannelGroupCard({
  channels,
  campaigns,
}: {
  channels: ChannelData[];
  campaigns: CampaignData[];
}) {
  // 1) Channel 데이터로 메인 분류 (sessions 합산)
  const buckets: Record<Bucket, number> = {
    'owned': 0,
    'earned-search': 0,
    'earned-community': 0,
    'earned-social': 0,
    'paid': 0,
  };

  channels.forEach(ch => {
    const bucket = classifyChannel(ch.channel);
    buckets[bucket] += ch.sessions;
  });

  // 2) Earned 세분화 — channels에 Referral 카테고리 하나로 묶여있어 campaigns로 보조
  // (channels의 Organic Social, Organic Search, Referral를 각각 매칭하므로 보통 충분)

  const totalSessions = Object.values(buckets).reduce((a, b) => a + b, 0);
  const meta = (b: Bucket) => BUCKET_META[b];

  // 3) PESO Top-level 합산 (Owned vs Earned vs Paid)
  const peso = {
    owned: buckets.owned,
    earned: buckets['earned-search'] + buckets['earned-community'] + buckets['earned-social'],
    paid: buckets.paid,
  };
  const pesoTotal = peso.owned + peso.earned + peso.paid || 1;

  // Top sources by bucket (campaigns)
  const topByBucket: Record<Bucket, CampaignData[]> = {
    'owned': [],
    'earned-search': [],
    'earned-community': [],
    'earned-social': [],
    'paid': [],
  };
  campaigns.forEach(c => {
    const b = classifyCampaign(c);
    if (b) topByBucket[b].push(c);
  });
  Object.keys(topByBucket).forEach(k => {
    topByBucket[k as Bucket].sort((a, b) => b.sessions - a.sessions);
  });

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono tracking-[0.18em] text-amber-600 font-bold uppercase">
            Channel · PESO Model
          </div>
          <h3 className="font-serif text-lg font-black mt-0.5">Owned / Earned / Paid</h3>
          <p className="text-[11px] text-gray-500">v3 §04 — 1인 운영 → Owned + Earned 90% / Paid 10%</p>
        </div>
        <div className="text-right text-[11px] text-gray-500 font-mono">
          총 {totalSessions.toLocaleString()} sessions
        </div>
      </div>

      {/* PESO top-level stacked bar */}
      <div className="mb-4">
        <div className="flex h-10 rounded-lg overflow-hidden border border-gray-200">
          {peso.owned > 0 && (
            <div
              className="bg-teal-500 flex items-center justify-center text-xs font-bold text-white"
              style={{ width: `${(peso.owned / pesoTotal) * 100}%` }}
              title={`Owned ${peso.owned}`}
            >
              {peso.owned / pesoTotal > 0.1 ? `Owned ${((peso.owned / pesoTotal) * 100).toFixed(0)}%` : ''}
            </div>
          )}
          {peso.earned > 0 && (
            <div
              className="bg-amber-500 flex items-center justify-center text-xs font-bold text-white"
              style={{ width: `${(peso.earned / pesoTotal) * 100}%` }}
              title={`Earned ${peso.earned}`}
            >
              {peso.earned / pesoTotal > 0.1 ? `Earned ${((peso.earned / pesoTotal) * 100).toFixed(0)}%` : ''}
            </div>
          )}
          {peso.paid > 0 ? (
            <div
              className="bg-rose-500 flex items-center justify-center text-xs font-bold text-white"
              style={{ width: `${(peso.paid / pesoTotal) * 100}%` }}
              title={`Paid ${peso.paid}`}
            >
              {peso.paid / pesoTotal > 0.05 ? `Paid ${((peso.paid / pesoTotal) * 100).toFixed(0)}%` : ''}
            </div>
          ) : (
            <div className="bg-gray-200 flex items-center justify-center text-[10px] text-gray-500" style={{ width: '5%', minWidth: '60px' }}>
              Paid 0
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-[11px]">
          <span className="text-teal-700 font-bold">🟢 Owned {peso.owned.toLocaleString()}</span>
          <span className="text-amber-700 font-bold">🟡 Earned {peso.earned.toLocaleString()}</span>
          <span className={peso.paid > 0 ? 'text-rose-700 font-bold' : 'text-gray-400'}>🔴 Paid {peso.paid.toLocaleString()}</span>
        </div>
      </div>

      {/* 5-bucket detail */}
      <div className="space-y-2">
        {(Object.keys(buckets) as Bucket[]).filter(b => buckets[b] > 0 || b === 'paid').map(b => {
          const m = meta(b);
          const pct = totalSessions > 0 ? (buckets[b] / totalSessions) * 100 : 0;
          const top = topByBucket[b].slice(0, 2);

          return (
            <div key={b} className={`${m.bg} rounded-lg p-3`}>
              <div className="flex items-center justify-between mb-1">
                <div className={`text-xs font-bold ${m.color}`}>{m.label}</div>
                <div className="text-[11px] font-mono text-gray-700">
                  {buckets[b].toLocaleString()} <span className="text-gray-500">({pct.toFixed(1)}%)</span>
                </div>
              </div>
              {top.length > 0 && (
                <div className="text-[10px] text-gray-600 font-mono">
                  Top: {top.map(t => `${t.source} (${t.sessions})`).join(' · ')}
                </div>
              )}
              {b === 'paid' && buckets[b] === 0 && (
                <div className="text-[10px] text-rose-600 italic">
                  AdSense LIVE 후 + Google Ads 캠페인 시작 시 채워짐 (Q2 OKR)
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-500 mt-3 italic">
        ※ Owned 비율 60% 이상 = retention 강함. 30% 이하로 떨어지면 광고 의존 신호 (counter metric).
      </p>
    </div>
  );
}
