import { generateText, parseJSON } from './gemini.provider.js';
import { getProject } from './project.service.js';

export interface GeneratedIdea {
  title: string;
  hook: string;
  description: string;
  keywords: string[];
  targetChannel: 'blog' | 'instagram' | 'threads' | 'longform' | 'shortform';
  priority: number;
}

interface GenerateArgs {
  projectId: string;
  keywords: string[];
  count?: number;
  channel?: 'blog' | 'instagram' | 'threads' | 'longform' | 'shortform';
  instruction?: string;
}

function buildBrandContext(project: Awaited<ReturnType<typeof getProject>>): string {
  if (!project) return '';
  const b = project.brand ?? {};
  const parts: string[] = [];
  if (b.name) parts.push(`브랜드명: ${b.name}`);
  if (b.description) parts.push(`소개: ${b.description}`);
  if (b.usp) parts.push(`핵심 차별점: ${b.usp}`);
  if (b.targetAudience) parts.push(`타겟 고객: ${b.targetAudience}`);
  if (b.tone) parts.push(`브랜드 톤: ${b.tone}`);
  if (b.snsGoal) parts.push(`SNS 목표: ${b.snsGoal}`);
  if (b.bannedKeywords?.length) parts.push(`사용 금지 키워드: ${b.bannedKeywords.join(', ')}`);

  const guide = project.writingGuide?.global;
  if (guide) parts.push(`공통 글쓰기 가이드:\n${guide}`);

  if (project.referenceSummary) parts.push(`참고 자료 요약:\n${project.referenceSummary}`);

  return parts.join('\n\n');
}

export async function generateIdeas({
  projectId,
  keywords,
  count = 8,
  channel,
  instruction,
}: GenerateArgs): Promise<GeneratedIdea[]> {
  if (keywords.length === 0) throw new Error('keywords required');

  const project = await getProject(projectId);
  const brand = buildBrandContext(project);
  const channelHint = channel
    ? `주요 타겟 채널: ${channel} (${channel === 'blog' ? '네이버 블로그' : channel === 'instagram' ? '인스타 카드뉴스' : channel === 'threads' ? '스레드' : channel === 'longform' ? 'YouTube 롱폼' : 'YouTube 숏폼'})`
    : '다양한 채널(블로그, 인스타, 스레드, YouTube 롱폼/숏폼) 중 가장 적합한 곳을 지정해주세요.';

  const userNote = instruction?.trim() ? `\n추가 지시: ${instruction.trim()}` : '';

  const prompt = `당신은 ${project?.brand?.name ?? '이 브랜드'}의 전문 콘텐츠 기획자입니다.
아래 키워드들을 활용해서 즉시 제작 가능한 콘텐츠 아이디어 ${count}개를 제안하세요.

키워드: ${keywords.join(', ')}

${brand ? `브랜드 컨텍스트:\n${brand}\n\n` : ''}${channelHint}${userNote}

각 아이디어에는 다음이 포함돼야 합니다:
- title: 콘텐츠 제목 (검색 유입 + 클릭 유도)
- hook: 1문장 후킹 (읽거나 보게 만드는 첫 문장)
- description: 2~3문장, 이 콘텐츠가 다룰 구체 범위
- keywords: 이 콘텐츠에 쓰일 3~6개 핵심 키워드 (입력 키워드 포함)
- targetChannel: blog | instagram | threads | longform | shortform 중 하나
- priority: 1(낮음) ~ 5(높음) 우선순위 점수

JSON 배열만 반환:
[{"title": "...", "hook": "...", "description": "...", "keywords": ["..."], "targetChannel": "blog", "priority": 4}, ...]`;

  const raw = await generateText(prompt);
  const ideas = parseJSON<GeneratedIdea[]>(raw, '아이디어 생성 실패');
  return ideas.slice(0, count);
}
