import type { IcpSpec, ProjectStrategy } from '@/features/settings/types';
import { useDraftIcp } from '../hooks/useStrategy';
import { useEditorStore } from '@/store/editor.store';

interface Props {
  strategy: ProjectStrategy;
  onPatch: (patch: Partial<ProjectStrategy>) => void;
}

export function IcpCard({ strategy, onPatch }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const draft = useDraftIcp();
  const icp = strategy.icp ?? {};

  const update = (partial: Partial<IcpSpec>) => onPatch({ icp: { ...icp, ...partial } });

  const handleAi = async () => {
    try {
      const result = await draft.mutateAsync(projectId);
      onPatch({ icp: result });
    } catch (err) {
      alert(`AI 초안 실패: ${(err as Error).message}`);
    }
  };

  return (
    <Section
      icon="🎯"
      title="ICP — 이상적 고객 프로필"
      onAi={handleAi}
      aiPending={draft.isPending}
    >
      <Field label="한 줄 요약">
        <input
          value={icp.summary ?? ''}
          onChange={(e) => update({ summary: e.target.value })}
          placeholder="예: 6개월 내 한능검 1급 취득이 목표인 20대 취준생"
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="연령대">
          <input
            value={icp.ageRange ?? ''}
            onChange={(e) => update({ ageRange: e.target.value })}
            placeholder="20~35세"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
          />
        </Field>
        <Field label="직업/상태">
          <input
            value={icp.occupation ?? ''}
            onChange={(e) => update({ occupation: e.target.value })}
            placeholder="공무원 수험생 / 대학생"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
          />
        </Field>
      </div>
      <ChipList
        label="고민 (Pains)"
        items={icp.pains ?? []}
        onChange={(v) => update({ pains: v })}
        placeholder="예: 양이 많아 어디부터 봐야 할지 모름"
      />
      <ChipList
        label="동기 (Motivations)"
        items={icp.motivations ?? []}
        onChange={(v) => update({ motivations: v })}
        placeholder="예: 가산점 / 자기 만족 / 학원 패스"
      />
      <ChipList
        label="구매 트리거"
        items={icp.buyingTriggers ?? []}
        onChange={(v) => update({ buyingTriggers: v })}
        placeholder="예: 시험 한 달 전 막판 정리 욕구"
      />
    </Section>
  );
}

import { Section, Field, ChipList } from './shared';
