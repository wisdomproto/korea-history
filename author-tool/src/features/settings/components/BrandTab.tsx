import type { ProjectSettings } from '../types';
import { SettingField, TextInput, Textarea, TagInput } from './SettingField';

interface Props {
  settings: ProjectSettings;
  onPatch: (patch: Partial<ProjectSettings>) => void;
}

export function BrandTab({ settings, onPatch }: Props) {
  const b = settings.brand ?? {};

  const updateBrand = (partial: Partial<typeof b>) => {
    onPatch({ brand: { ...b, ...partial } });
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* ───── 브랜드 기본 ───── */}
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          브랜드 정체성
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingField label="브랜드명" hint="AI 생성 시 본문에 사용됩니다">
            <TextInput
              value={b.name}
              onChange={(v) => updateBrand({ name: v })}
              placeholder="예: 기출노트"
              maxLength={60}
            />
          </SettingField>

          <SettingField label="업종/카테고리">
            <TextInput
              value={b.industry}
              onChange={(v) => updateBrand({ industry: v })}
              placeholder="예: 교육 / 자격증"
              maxLength={40}
            />
          </SettingField>
        </div>

        <SettingField label="브랜드 설명" hint="한두 문장으로 '무엇을 하는 곳인지' 설명">
          <Textarea
            value={b.description}
            onChange={(v) => updateBrand({ description: v })}
            placeholder="예: 한국사능력검정시험 1,900여 문제 + 87개 시대별 요약노트를 제공하는 무료 학습 사이트"
            rows={3}
            maxLength={300}
          />
        </SettingField>

        <SettingField label="USP (핵심 차별점)" hint="경쟁사 대비 우리만의 강점">
          <Textarea
            value={b.usp}
            onChange={(v) => updateBrand({ usp: v })}
            placeholder="예: 문제 해설마다 YouTube 타임스탬프 해설 + 시대별 요약노트 자동 연결"
            rows={2}
            maxLength={300}
          />
        </SettingField>

        <SettingField label="타겟 고객" hint="연령대 · 직업 · 고민 · 동기">
          <Textarea
            value={b.targetAudience}
            onChange={(v) => updateBrand({ targetAudience: v })}
            placeholder="예: 20대 취준생 / 공무원 수험생 / 학생. 단기간에 한능검 2급 이상 취득하려는 사람"
            rows={3}
            maxLength={400}
          />
        </SettingField>

        <SettingField label="SNS 목표" hint="유입 · 신뢰도 · 유료 전환 등">
          <TextInput
            value={b.snsGoal}
            onChange={(v) => updateBrand({ snsGoal: v })}
            placeholder="예: 한능검 검색 유입 확대 + 요약노트 브랜드 인지도 구축"
            maxLength={120}
          />
        </SettingField>
      </section>

      {/* ───── 톤 ───── */}
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          브랜드 톤
        </h3>
        <SettingField label="브랜드 톤 & 보이스" hint="밝은/진중한/친근한 등 — AI 콘텐츠 생성 시 적용">
          <Textarea
            value={b.tone}
            onChange={(v) => updateBrand({ tone: v })}
            placeholder="예: 수험생과 같은 눈높이로 친근하게. 단, 사실/연도/사건명은 정확하고 진중하게. 이모지는 최소한만."
            rows={3}
            maxLength={500}
          />
        </SettingField>

        <SettingField label="사용 금지 키워드" hint="AI 생성 결과에서 피해야 할 표현. Enter로 추가">
          <TagInput
            value={b.bannedKeywords}
            onChange={(v) => updateBrand({ bannedKeywords: v })}
            placeholder="예: 합격보장, 무조건, 100%"
          />
        </SettingField>
      </section>

      {/* ───── 담당자 페르소나 ───── */}
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          담당 마케터/필자 페르소나
        </h3>
        <p className="text-xs text-gray-500">
          콘텐츠에서 '나는 OO입니다' 식으로 등장할 1인칭 화자를 정의합니다. AI가 참고해 일관된 톤을 유지합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingField label="이름/닉네임">
            <TextInput
              value={b.marketerName}
              onChange={(v) => updateBrand({ marketerName: v })}
              placeholder="예: 기출노트 에디터"
              maxLength={40}
            />
          </SettingField>
          <SettingField label="전문 분야/경력">
            <TextInput
              value={b.marketerExpertise}
              onChange={(v) => updateBrand({ marketerExpertise: v })}
              placeholder="예: 한능검 10년 경력 한국사 콘텐츠 에디터"
              maxLength={120}
            />
          </SettingField>
        </div>

        <SettingField label="문체 스타일">
          <Textarea
            value={b.marketerStyle}
            onChange={(v) => updateBrand({ marketerStyle: v })}
            placeholder="예: 짧은 문장, 예시 중심, '~이에요' 체. 기출 문제 풀이 후기 포맷."
            rows={3}
            maxLength={400}
          />
        </SettingField>

        <SettingField label="자주 쓰는 표현" hint="본인만의 반복 문구 — AI가 자연스럽게 섞어 씁니다">
          <TagInput
            value={b.marketerPhrases}
            onChange={(v) => updateBrand({ marketerPhrases: v })}
            placeholder="예: 이건 진짜 꿀팁, 한 줄 요약하면"
          />
        </SettingField>
      </section>
    </div>
  );
}
