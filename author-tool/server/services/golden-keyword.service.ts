import { generateText, parseJSON } from './gemini.provider.js';
import { getProject } from './project.service.js';

export interface GoldenKeyword {
  keyword: string;
  totalSearch: number;
  competition: string;
  strategy: string;
  priority: number;
}

export interface GoldenInsight {
  title: string;
  description: string;
  color: 'teal' | 'amber' | 'coral' | 'purple';
}

export interface GoldenAnalysis {
  goldenKeywords: GoldenKeyword[];
  insights: GoldenInsight[];
}

interface AnalyzeInput {
  projectId?: string;
  source: 'naver' | 'google';
  keywords: Array<{
    keyword: string;
    totalVolume: number;
    competition: string;
  }>;
  instruction?: string;
}

function buildBrandContext(project: Awaited<ReturnType<typeof getProject>>): string {
  if (!project) return '(프로젝트 정보 없음)';
  const b = project.brand ?? {};
  const parts: string[] = [];
  if (b.name) parts.push(`브랜드: ${b.name}`);
  if (b.description) parts.push(`소개: ${b.description}`);
  if (b.usp) parts.push(`차별점: ${b.usp}`);
  if (b.targetAudience) parts.push(`타겟: ${b.targetAudience}`);
  if (b.tone) parts.push(`톤: ${b.tone}`);
  if (project.referenceSummary) parts.push(`참고 요약:\n${project.referenceSummary.slice(0, 1500)}`);
  return parts.length ? parts.join('\n') : '(브랜드 정보 미입력)';
}

export async function analyzeGoldenKeywords(input: AnalyzeInput): Promise<GoldenAnalysis> {
  if (input.keywords.length === 0) {
    return { goldenKeywords: [], insights: [] };
  }

  const project = input.projectId ? await getProject(input.projectId) : null;
  const brand = buildBrandContext(project);

  // Filter out '높음' competition (blog SEO can't compete) before passing to AI,
  // then cap at 60 to keep prompt manageable.
  // We still pass all if competition labels are missing (unknown).
  const blogFriendly = input.keywords.filter((k) => {
    const c = k.competition || '';
    return !c.includes('높음') && !c.toUpperCase().includes('HIGH');
  });
  const candidates = blogFriendly.length >= 5 ? blogFriendly : input.keywords;
  const sorted = [...candidates].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 60);
  const tableRows = sorted
    .map((k, i) => `${i + 1}. ${k.keyword} | 월 ${k.totalVolume.toLocaleString()} | 경쟁 ${k.competition || 'N/A'}`)
    .join('\n');

  const platformLabel = input.source === 'google' ? 'Google Ads (DataForSEO)' : '네이버 검색광고';

  const prompt = `당신은 ${platformLabel} 데이터로 **블로그 SEO 황금 키워드**를 골라내는 전문가입니다.

## 브랜드 컨텍스트
${brand}

## 분석 대상 키워드 (월간 검색량 + 경쟁률)
${tableRows}

${input.instruction ? `\n## 추가 지시\n${input.instruction}\n` : ''}

## 🥇 황금 키워드 선정 알고리즘

**대원칙: "경쟁이 '높음/HIGH'이 아닌 모든 키워드 + 검색량 큰 순서대로" 가 황금**

### 포함 대상 (이 둘 중 하나면 황금 후보)
1. 경쟁률이 **"낮음" / "중간" / "LOW" / "MEDIUM"** 인 키워드 → **vol 큰 순서대로** 황금에 포함
2. 경쟁률 정보가 없거나 vol=0이라도, **검색 의도가 매우 명확한 longtail** → 보너스로 2~4개 추가

### ❌ 절대 황금 아님 (제외할 것)
- 경쟁이 **"높음" 또는 "HIGH"** 인 키워드 (예외 없음. 블로그 1페이지 진입 불가)

### ✅ 황금 작성 시 강제 규칙
- **vol 큰 키워드부터 빠짐없이** 채워라. 작은 longtail부터 채우면 안 됨
- broad 단일 키워드("한능검", "한국사", "메가스터디", "키크는영양제" 등)도 경쟁이 낮음/중간이면 **무조건 황금**. broad라고 제외하지 말 것
- 입력 데이터에 vol 1000+ AND 경쟁≠높음 인 키워드가 있다면 **반드시 priority 1번부터 그 키워드들이 차지**해야 함
- 후순위에 vol=0 longtail을 보너스로 2~4개만 추가 (8~12개 황금 중 마지막 자리)

## 응답 형식
**반드시 아래 JSON 구조만** (마크다운 fence/설명 금지):
{
  "goldenKeywords": [
    {
      "keyword": "키워드",
      "totalSearch": 0,
      "competition": "낮음|중간|LOW|MEDIUM",
      "strategy": "왜 이게 황금인지 + 어떤 글을 쓰면 1페이지 진입 가능한지 구체적으로 (2~3문장)",
      "priority": 1
    }
  ],
  "insights": [
    {
      "title": "인사이트 제목 (15자 이내)",
      "description": "데이터에서 발견한 패턴/기회 (1~2문장)",
      "color": "teal|amber|coral|purple"
    }
  ]
}

황금 8~12개, 인사이트 3~4개. priority는 반드시 1부터 sequential 하게 (1, 2, 3, 4, ...) — 같은 숫자 반복 금지.

색상 가이드:
- teal: 기회/성장 (큰 트래픽 + 낮은 경쟁 = 메인 공략)
- amber: 주의 (경쟁 격화 중, 시기 중요)
- coral: 위험 (포화, 비추천)
- purple: 패턴/인사이트 (검색 의도, 사용자 행동)`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<GoldenAnalysis>(raw, '황금 키워드 분석 실패');

  // Sanitize and re-rank by volume desc (the real signal for blog opportunity
  // in the user's data — already filtered by 'not high comp').
  // We override Gemini's priority because LLMs frequently misorder when many keywords
  // are in scope, and we want the deterministic "high vol low comp first" rule.
  const items = (parsed.goldenKeywords ?? []).filter((g) => g.keyword);
  items.sort((a, b) => b.totalSearch - a.totalSearch);
  items.forEach((g, i) => { g.priority = i + 1; });
  parsed.goldenKeywords = items;
  parsed.insights = parsed.insights ?? [];
  return parsed;
}
