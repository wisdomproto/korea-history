import type { ProjectSettings } from '../types';
import { SettingField, Textarea } from './SettingField';

interface Props {
  settings: ProjectSettings;
  onPatch: (patch: Partial<ProjectSettings>) => void;
}

const CHANNEL_TIPS: Record<string, string> = {
  blog: '네이버 블로그용. SEO 구조, 키워드 배치, 소제목 리듬, CTR을 높이는 본문 길이 등',
  instagram: '카드뉴스/릴스 캡션용. 1장 한 줄 규칙, 해시태그 스타일, 후킹 문장',
  threads: '스레드 포스팅용. 한 호흡의 짧은 문장, 연속 포스팅 구성',
  youtube: '영상 대본용. 오프닝 3초 훅, 챕터 구조, 1분 단위 리듬',
};

export function WritingGuideTab({ settings, onPatch }: Props) {
  const g = settings.writingGuide ?? {};

  const update = (partial: Partial<typeof g>) => {
    onPatch({ writingGuide: { ...g, ...partial } });
  };

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          공통 글쓰기 가이드
        </h3>
        <p className="text-xs text-gray-500">
          모든 채널에 공통으로 적용됩니다. 브랜드 보이스, 금지 표현, 문단 구조 등을 기록하세요.
        </p>
        <SettingField label="Global Guide" hint="브랜드 톤 다음 우선순위. 구체적일수록 좋습니다.">
          <Textarea
            value={g.global}
            onChange={(v) => update({ global: v })}
            placeholder={`예시:\n- 한 문단은 3문장 이내.\n- 사실 확인이 어려운 연도/인명은 쓰지 않는다.\n- "공부하세요" 같은 명령형 대신 "~하면 좋아요" 권유형 사용.\n- 한국사 용어는 교과서 표기법 따르기.`}
            rows={10}
            maxLength={3000}
          />
        </SettingField>
      </section>

      <section className="space-y-6">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          채널별 가이드
        </h3>

        {(['blog', 'instagram', 'threads', 'youtube'] as const).map((ch) => {
          const labels: Record<typeof ch, string> = {
            blog: '📖 네이버 블로그',
            instagram: '📸 인스타 카드뉴스',
            threads: '🧵 스레드',
            youtube: '🎬 YouTube (롱폼/숏폼)',
          };
          return (
            <div key={ch} className="rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-800">{labels[ch]}</h4>
                <span className="text-[10px] text-gray-400">
                  공통 가이드에 이어서 적용됨
                </span>
              </div>
              <p className="text-[11px] text-gray-500">{CHANNEL_TIPS[ch]}</p>
              <Textarea
                value={g[ch]}
                onChange={(v) => update({ [ch]: v } as Partial<typeof g>)}
                placeholder={`${labels[ch]} 전용 규칙...`}
                rows={6}
                maxLength={2000}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
