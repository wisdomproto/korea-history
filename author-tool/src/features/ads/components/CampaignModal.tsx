import { useEffect, useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useCreateCampaign, useUpdateCampaign } from '../hooks/useAds';
import type { AdCampaign, AdPlatform, AdStatus, AdObjective } from '../types';

interface Props {
  open: boolean;
  campaign: AdCampaign | null;
  onClose: () => void;
}

const PLATFORMS: Array<{ key: AdPlatform; label: string; icon: string }> = [
  { key: 'meta', label: 'Meta (IG/FB)', icon: '📘' },
  { key: 'google', label: 'Google Ads', icon: '🔵' },
  { key: 'youtube', label: 'YouTube Ads', icon: '▶️' },
  { key: 'naver_search', label: 'Naver 검색', icon: '🟢' },
  { key: 'naver_gfa', label: 'Naver GFA', icon: '🟩' },
  { key: 'kakao', label: 'Kakao', icon: '💛' },
  { key: 'other', label: '기타', icon: '•' },
];

const STATUSES: AdStatus[] = ['draft', 'active', 'paused', 'ended'];

const OBJECTIVES: Array<{ key: AdObjective; label: string }> = [
  { key: 'awareness', label: '인지도' },
  { key: 'traffic', label: '트래픽' },
  { key: 'engagement', label: '참여' },
  { key: 'leads', label: '잠재고객' },
  { key: 'conversions', label: '전환' },
  { key: 'app', label: '앱' },
  { key: 'sales', label: '판매' },
];

type FormState = {
  platform: AdPlatform;
  name: string;
  status: AdStatus;
  objective: AdObjective | '';
  startDate: string;
  endDate: string;
  budgetTotal: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  landingUrl: string;
  primaryKeyword: string;
  notes: string;
};

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function CampaignModal({ open, campaign, onClose }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const isEdit = !!campaign;

  const [form, setForm] = useState<FormState>({
    platform: 'meta',
    name: '',
    status: 'active',
    objective: '',
    startDate: todayISO(),
    endDate: '',
    budgetTotal: 0,
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    conversionValue: 0,
    landingUrl: '',
    primaryKeyword: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      setForm({
        platform: campaign.platform,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective ?? '',
        startDate: campaign.start_date,
        endDate: campaign.end_date ?? '',
        budgetTotal: campaign.budget_total,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        conversionValue: campaign.conversion_value,
        landingUrl: campaign.landing_url ?? '',
        primaryKeyword: campaign.primary_keyword ?? '',
        notes: campaign.notes ?? '',
      });
    } else {
      setForm({
        platform: 'meta',
        name: '',
        status: 'active',
        objective: '',
        startDate: todayISO(),
        endDate: '',
        budgetTotal: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
        landingUrl: '',
        primaryKeyword: '',
        notes: '',
      });
    }
  }, [open, campaign]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('캠페인 이름을 입력하세요');
      return;
    }
    try {
      if (isEdit && campaign) {
        await update.mutateAsync({
          id: campaign.id,
          patch: {
            platform: form.platform,
            name: form.name,
            status: form.status,
            objective: form.objective || undefined,
            start_date: form.startDate,
            end_date: form.endDate || null,
            budget_total: form.budgetTotal,
            spend: form.spend,
            impressions: form.impressions,
            clicks: form.clicks,
            conversions: form.conversions,
            conversion_value: form.conversionValue,
            landing_url: form.landingUrl || undefined,
            primary_keyword: form.primaryKeyword || undefined,
            notes: form.notes || undefined,
          },
        });
      } else {
        await create.mutateAsync({
          projectId,
          platform: form.platform,
          name: form.name,
          status: form.status,
          objective: form.objective || undefined,
          startDate: form.startDate,
          endDate: form.endDate || null,
          budgetTotal: form.budgetTotal,
          spend: form.spend,
          impressions: form.impressions,
          clicks: form.clicks,
          conversions: form.conversions,
          conversionValue: form.conversionValue,
          landingUrl: form.landingUrl || undefined,
          primaryKeyword: form.primaryKeyword || undefined,
          notes: form.notes || undefined,
        });
      }
      onClose();
    } catch (err) {
      alert(`저장 실패: ${(err as Error).message}`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-extrabold">
          {isEdit ? '캠페인 수정' : '+ 새 캠페인'}
        </h3>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="플랫폼">
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value as AdPlatform })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>{p.icon} {p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="상태">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AdStatus })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s === 'draft' ? '초안' : s === 'active' ? '진행 중' : s === 'paused' ? '일시정지' : '종료'}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="캠페인 이름" required>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 한능검 77회 앞두고 블로그 키워드 리타겟팅"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="목표">
              <select
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value as AdObjective })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
              >
                <option value="">선택</option>
                {OBJECTIVES.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="주요 키워드">
              <input
                value={form.primaryKeyword}
                onChange={(e) => setForm({ ...form, primaryKeyword: e.target.value })}
                placeholder="예: 한능검 공부법"
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일" required>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
              />
            </Field>
            <Field label="종료일 (선택)">
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
              />
            </Field>
          </div>

          <Field label="랜딩 URL">
            <input
              value={form.landingUrl}
              onChange={(e) => setForm({ ...form, landingUrl: e.target.value })}
              placeholder="https://gcnote.co.kr/..."
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <NumberField label="총 예산 (KRW)" value={form.budgetTotal} onChange={(v) => setForm({ ...form, budgetTotal: v })} />
            <NumberField label="지출 (KRW)" value={form.spend} onChange={(v) => setForm({ ...form, spend: v })} />
            <NumberField label="노출" value={form.impressions} onChange={(v) => setForm({ ...form, impressions: v })} />
            <NumberField label="클릭" value={form.clicks} onChange={(v) => setForm({ ...form, clicks: v })} />
            <NumberField label="전환" value={form.conversions} onChange={(v) => setForm({ ...form, conversions: v })} />
            <NumberField label="전환 매출 (KRW)" value={form.conversionValue} onChange={(v) => setForm({ ...form, conversionValue: v })} />
          </div>

          <Field label="메모">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="학습 내용 · 가설 · 다음 개선점"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending || update.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white disabled:bg-gray-300 hover:bg-emerald-700"
          >
            {create.isPending || update.isPending ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[11px] font-semibold text-gray-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        min={0}
        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs tabular-nums"
      />
    </Field>
  );
}
