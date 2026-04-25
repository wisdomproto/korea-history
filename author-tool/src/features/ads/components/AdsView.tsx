import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useCampaigns, useAdSummary, useDeleteCampaign, useUpdateCampaign } from '../hooks/useAds';
import type { AdCampaign, AdPlatform, AdStatus } from '../types';
import { CampaignModal } from './CampaignModal';

const PLATFORM_META: Record<AdPlatform, { label: string; icon: string; color: string }> = {
  meta: { label: 'Meta', icon: '📘', color: 'bg-blue-50 text-blue-700' },
  google: { label: 'Google', icon: '🔵', color: 'bg-sky-50 text-sky-700' },
  naver_search: { label: 'Naver 검색', icon: '🟢', color: 'bg-green-50 text-green-700' },
  naver_gfa: { label: 'Naver GFA', icon: '🟩', color: 'bg-emerald-50 text-emerald-700' },
  youtube: { label: 'YouTube', icon: '▶️', color: 'bg-red-50 text-red-700' },
  kakao: { label: 'Kakao', icon: '💛', color: 'bg-yellow-50 text-yellow-700' },
  other: { label: '기타', icon: '•', color: 'bg-gray-50 text-gray-600' },
};

const STATUS_META: Record<AdStatus, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-gray-100 text-gray-600' },
  active: { label: '진행 중', color: 'bg-emerald-100 text-emerald-700' },
  paused: { label: '일시정지', color: 'bg-amber-100 text-amber-700' },
  ended: { label: '종료', color: 'bg-gray-100 text-gray-400' },
};

function fmtKRW(n: number): string {
  return `₩${n.toLocaleString()}`;
}

export function AdsView() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const [platformFilter, setPlatformFilter] = useState<'all' | AdPlatform>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AdStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdCampaign | null>(null);

  const { data: campaigns = [], isLoading, error, refetch } = useCampaigns({
    projectId,
    platform: platformFilter === 'all' ? undefined : platformFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: summary } = useAdSummary(projectId);
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();

  const notConfigured = (error as Error | undefined)?.message?.includes('R2');

  const handleEdit = (c: AdCampaign) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleDelete = async (c: AdCampaign) => {
    if (!confirm(`"${c.name}" 캠페인을 삭제할까요?`)) return;
    await deleteCampaign.mutateAsync(c.id);
  };

  const handleQuickStatus = async (c: AdCampaign, status: AdStatus) => {
    await updateCampaign.mutateAsync({ id: c.id, patch: { status } });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">📣 광고 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Meta · Google · Naver · YouTube · Kakao 캠페인 수동 추적 · 통합 KPI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-50"
          >
            새로고침
          </button>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700"
          >
            + 새 캠페인
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            ⚠️ R2가 설정되지 않았습니다. 광고 캠페인 데이터는 R2 JSON에 저장됩니다.
          </div>
        )}

        {/* KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Kpi label="총 캠페인" value={`${summary.totalCampaigns}개`} sub={`진행 ${summary.activeCampaigns}`} />
            <Kpi label="총 지출" value={fmtKRW(summary.totalSpend)} sub={`예산 ${fmtKRW(summary.totalBudget)}`} accent="rose" />
            <Kpi label="총 클릭" value={summary.totalClicks.toLocaleString()} sub={`${summary.totalImpressions.toLocaleString()} 노출`} />
            <Kpi label="평균 CTR" value={`${summary.avgCtr}%`} accent="sky" />
            <Kpi label="평균 CPC" value={fmtKRW(summary.avgCpc)} accent="amber" />
            <Kpi label="평균 ROAS" value={`${summary.avgRoas}x`} sub={`CPA ${fmtKRW(summary.avgCpa)}`} accent="emerald" />
          </div>
        )}

        {/* Platform breakdown */}
        {summary && summary.byPlatform.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold mb-3">플랫폼별 성과</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-1.5 px-2">플랫폼</th>
                    <th className="text-right py-1.5 px-2">캠페인</th>
                    <th className="text-right py-1.5 px-2">지출</th>
                    <th className="text-right py-1.5 px-2">노출</th>
                    <th className="text-right py-1.5 px-2">클릭</th>
                    <th className="text-right py-1.5 px-2">CTR</th>
                    <th className="text-right py-1.5 px-2">CPC</th>
                    <th className="text-right py-1.5 px-2">CPA</th>
                    <th className="text-right py-1.5 px-2">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byPlatform.map((p) => (
                    <tr key={p.platform} className="border-t border-gray-100">
                      <td className="py-1.5 px-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLATFORM_META[p.platform].color}`}>
                          {PLATFORM_META[p.platform].icon} {PLATFORM_META[p.platform].label}
                        </span>
                      </td>
                      <td className="text-right py-1.5 px-2">{p.campaigns}</td>
                      <td className="text-right py-1.5 px-2 font-bold">{fmtKRW(p.spend)}</td>
                      <td className="text-right py-1.5 px-2 tabular-nums">{p.impressions.toLocaleString()}</td>
                      <td className="text-right py-1.5 px-2 tabular-nums">{p.clicks.toLocaleString()}</td>
                      <td className="text-right py-1.5 px-2 text-sky-600">{p.ctr}%</td>
                      <td className="text-right py-1.5 px-2 text-amber-600">{fmtKRW(p.cpc)}</td>
                      <td className="text-right py-1.5 px-2 text-rose-600">{fmtKRW(p.cpa)}</td>
                      <td className="text-right py-1.5 px-2 font-bold text-emerald-600">{p.roas}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase">플랫폼</span>
          <button
            onClick={() => setPlatformFilter('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              platformFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            전체 {campaigns.length}
          </button>
          {(['meta', 'google', 'naver_search', 'naver_gfa', 'youtube', 'kakao', 'other'] as const).map((p) => {
            const n = summary?.byPlatform.find((x) => x.platform === p)?.campaigns ?? 0;
            if (n === 0) return null;
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  platformFilter === p ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {PLATFORM_META[p].icon} {PLATFORM_META[p].label} {n}
              </button>
            );
          })}
          <div className="w-4" />
          <span className="text-[10px] font-bold text-gray-400 uppercase">상태</span>
          {(['all', 'active', 'paused', 'draft', 'ended'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {s === 'all' ? '전체' : STATUS_META[s].label}
            </button>
          ))}
        </div>

        {/* Campaign table */}
        {isLoading ? (
          <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            등록된 캠페인이 없습니다. <br />
            <button
              onClick={handleAdd}
              className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              + 첫 캠페인 추가하기
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2">캠페인</th>
                  <th className="text-center px-3 py-2">플랫폼</th>
                  <th className="text-center px-3 py-2">상태</th>
                  <th className="text-left px-3 py-2">기간</th>
                  <th className="text-right px-3 py-2">지출/예산</th>
                  <th className="text-right px-3 py-2">노출/클릭</th>
                  <th className="text-right px-3 py-2">CTR</th>
                  <th className="text-right px-3 py-2">CPC/CPA</th>
                  <th className="text-right px-3 py-2">ROAS</th>
                  <th className="text-right px-3 py-2">액션</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{c.name}</div>
                      {c.primary_keyword && (
                        <div className="text-[10px] text-gray-400">#{c.primary_keyword}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLATFORM_META[c.platform].color}`}>
                        {PLATFORM_META[c.platform].icon} {PLATFORM_META[c.platform].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <select
                        value={c.status}
                        onChange={(e) => handleQuickStatus(c, e.target.value as AdStatus)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border-0 ${STATUS_META[c.status].color}`}
                      >
                        {(['draft', 'active', 'paused', 'ended'] as const).map((s) => (
                          <option key={s} value={s}>{STATUS_META[s].label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      {c.start_date}
                      {c.end_date ? ` ~ ${c.end_date}` : ' ~'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <div className="font-bold text-rose-600">{fmtKRW(c.spend)}</div>
                      {c.budget_total > 0 && (
                        <div className="text-[10px] text-gray-400">/ {fmtKRW(c.budget_total)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <div className="text-gray-700">{c.impressions.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500">{c.clicks.toLocaleString()} 클릭</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-sky-600">{c.ctr}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <div className="text-amber-600">{fmtKRW(c.cpc ?? 0)}</div>
                      {(c.cpa ?? 0) > 0 && (
                        <div className="text-[10px] text-rose-500">{fmtKRW(c.cpa ?? 0)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-600">
                      {c.roas}x
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="rounded px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="rounded px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CampaignModal open={modalOpen} campaign={editing} onClose={() => setModalOpen(false)} />
    </div>
  );
}

interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  accent?: 'rose' | 'sky' | 'amber' | 'emerald';
}

function Kpi({ label, value, sub, accent }: KpiProps) {
  const colors: Record<string, string> = {
    rose: 'text-rose-700',
    sky: 'text-sky-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="text-[10px] font-bold text-gray-500 uppercase">{label}</div>
      <div className={`text-xl font-extrabold mt-1 ${accent ? colors[accent] : ''}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
