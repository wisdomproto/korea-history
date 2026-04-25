import { generateText, parseJSON } from './gemini.provider.js';
import { getProject } from './project.service.js';
import type {
  IcpSpec, JtbdSpec, FunnelStage, ChannelMixItem, SeasonEvent, Okr,
} from './project.service.js';

export type StrategySection = 'icp' | 'jtbds' | 'funnel' | 'channelMix' | 'seasonCalendar' | 'okrs';

function buildBrandContext(project: Awaited<ReturnType<typeof getProject>>): string {
  if (!project) return '';
  const b = project.brand ?? {};
  const parts: string[] = [];
  if (b.name) parts.push(`브랜드명: ${b.name}`);
  if (b.industry) parts.push(`업종: ${b.industry}`);
  if (b.description) parts.push(`소개: ${b.description}`);
  if (b.usp) parts.push(`USP: ${b.usp}`);
  if (b.targetAudience) parts.push(`타겟: ${b.targetAudience}`);
  if (b.tone) parts.push(`브랜드 톤: ${b.tone}`);
  if (b.snsGoal) parts.push(`SNS 목표: ${b.snsGoal}`);
  return parts.join('\n');
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function draftIcp(projectId: string): Promise<IcpSpec> {
  const project = await getProject(projectId);
  const brand = buildBrandContext(project);

  const prompt = `브랜드 정보:
${brand || '(미입력)'}

위 브랜드의 이상적 고객 프로필(ICP)을 추출하세요.

JSON만 반환:
{
  "summary": "한 문장 요약",
  "ageRange": "예: 20~35세",
  "occupation": "예: 취준생/직장인/학생",
  "pains": ["고민1", "고민2", "고민3"],
  "motivations": ["동기1", "동기2"],
  "buyingTriggers": ["전환 트리거1", "전환 트리거2"]
}`;

  const raw = await generateText(prompt);
  return parseJSON<IcpSpec>(raw, 'ICP 초안 생성 실패');
}

export async function draftJtbds(projectId: string): Promise<JtbdSpec[]> {
  const project = await getProject(projectId);
  const brand = buildBrandContext(project);
  const icp = project?.strategy?.icp;
  const icpBlock = icp ? `\nICP:\n- summary: ${icp.summary ?? ''}\n- pains: ${(icp.pains ?? []).join(', ')}\n- motivations: ${(icp.motivations ?? []).join(', ')}` : '';

  const prompt = `브랜드 정보:
${brand}${icpBlock}

이 고객이 가지는 5개의 Jobs-to-be-Done(JTBD)를 만드세요.
각 JTBD는 "When [상황], I want to [동기], so I can [결과]" 형식.

JSON만 반환:
{"jtbds": [{"situation": "...", "motivation": "...", "outcome": "..."}, ...]}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<{ jtbds: Array<{ situation: string; motivation: string; outcome: string }> }>(raw, 'JTBD 초안 생성 실패');
  return parsed.jtbds.map((j) => ({ id: makeId('jtbd'), ...j }));
}

const FUNNEL_LABELS: Record<string, string> = {
  awareness: '인지', interest: '관심', evaluation: '평가',
  conversion: '전환', retention: '유지', advocacy: '추천',
};

export async function draftFunnel(projectId: string): Promise<FunnelStage[]> {
  const project = await getProject(projectId);
  const brand = buildBrandContext(project);

  const prompt = `브랜드 정보:
${brand}

AARRR(Pirate) 6단계 퍼널을 설계하세요. 각 단계마다 KPI 1개 + 추천 채널 2~3개.

단계: awareness, interest, evaluation, conversion, retention, advocacy

JSON만 반환:
{"stages": [{"name": "awareness", "description": "...", "kpiName": "...", "kpiTarget": 0, "channels": ["blog","youtube"]}, ...]}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<{
    stages: Array<{
      name: FunnelStage['name'];
      description: string;
      kpiName: string;
      kpiTarget: number;
      channels: string[];
    }>;
  }>(raw, '퍼널 초안 생성 실패');
  return parsed.stages.map((s) => ({
    id: makeId('stage'),
    name: s.name,
    label: FUNNEL_LABELS[s.name] ?? s.name,
    description: s.description,
    kpiName: s.kpiName,
    kpiTarget: s.kpiTarget,
    channels: s.channels,
  }));
}

export async function draftChannelMix(projectId: string): Promise<ChannelMixItem[]> {
  const project = await getProject(projectId);
  const brand = buildBrandContext(project);

  const prompt = `브랜드 정보:
${brand}

브랜드에 가장 적합한 채널 믹스를 설계하세요. 각 채널은 weight(% 합 100) + purpose.

가능한 채널: blog, naver_blog, instagram, youtube, threads, email, ads_meta, ads_google, ads_naver, community, kakao

JSON만 반환:
{"items": [{"channel": "blog", "weightPct": 30, "purpose": "..."}, ...]}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<{
    items: Array<{ channel: string; weightPct: number; purpose: string }>;
  }>(raw, '채널 믹스 생성 실패');
  return parsed.items.map((i) => ({ id: makeId('mix'), ...i }));
}

export async function draftOkrs(projectId: string, quarter: string): Promise<Okr[]> {
  const project = await getProject(projectId);
  const brand = buildBrandContext(project);

  const prompt = `브랜드 정보:
${brand}

${quarter} 분기 OKR 2~3개를 만드세요.
- objective: 정성적 · 영감적
- keyResults: 정량적 (target/unit 포함) 3~4개

JSON만 반환:
{"okrs": [{"objective": "...", "keyResults": [{"text": "...", "target": 0, "unit": "..."}]}]}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<{
    okrs: Array<{
      objective: string;
      keyResults: Array<{ text: string; target?: number; unit?: string }>;
    }>;
  }>(raw, 'OKR 생성 실패');
  return parsed.okrs.map((o) => ({
    id: makeId('okr'),
    quarter,
    objective: o.objective,
    keyResults: o.keyResults.map((kr) => ({
      id: makeId('kr'),
      text: kr.text,
      target: kr.target,
      unit: kr.unit,
    })),
  }));
}

export async function draftSeasonCalendar(projectId: string): Promise<SeasonEvent[]> {
  const project = await getProject(projectId);
  const brand = buildBrandContext(project);

  const prompt = `브랜드 정보:
${brand}

향후 12개월 시즌 캘린더를 작성하세요. 시험일/캠페인/공휴일/런칭 등.
한국 기준. 가능하면 실제 한국 시험 일정/명절을 반영.

JSON만 반환:
{"events": [{"date": "2026-08-09", "name": "한국사능력검정시험 78회", "type": "exam", "notes": "..."}, ...]}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<{
    events: Array<{ date: string; name: string; type: SeasonEvent['type']; notes?: string }>;
  }>(raw, '시즌 캘린더 생성 실패');
  return parsed.events.map((e) => ({ id: makeId('evt'), ...e }));
}
