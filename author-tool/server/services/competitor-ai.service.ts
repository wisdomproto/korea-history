import { generateText, parseJSON } from './gemini.provider.js';
import * as competitor from './competitor.service.js';
import { getProject } from './project.service.js';

export interface TopicExtraction {
  topics: string[];
  perContent: Array<{ contentId: string; topics: string[]; keywords: string[] }>;
}

export async function extractTopics(competitorId: string): Promise<TopicExtraction> {
  const c = await competitor.getCompetitor(competitorId);
  if (!c) throw new Error('Competitor not found');
  if (c.contents.length === 0) {
    return { topics: [], perContent: [] };
  }

  const items = c.contents.slice(0, 30).map((ct, i) => ({
    idx: i,
    id: ct.id,
    title: ct.title,
  }));

  const prompt = `다음은 경쟁사 "${c.name}"가 최근 발행한 콘텐츠 제목입니다.
각 제목의 주제(topic)와 키워드(keywords)를 추출하고, 전체 주제 클러스터(topic_clusters)도 정리해주세요.

콘텐츠 (${items.length}개):
${items.map((i) => `[${i.idx}] ${i.title}`).join('\n')}

규칙:
- topics: 주제 분류 (예: "고려사 인물", "조선 후기 정치", "한능검 시험 팁")
- keywords: 콘텐츠 핵심 키워드 (3~5개)
- topic_clusters: 30개 콘텐츠를 묶은 주제 군집 (5~10개, 빈도 높은 순)

JSON만 반환:
{
  "topic_clusters": ["...", ...],
  "items": [{"idx": 0, "topics": ["..."], "keywords": ["..."]}, ...]
}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<{
    topic_clusters: string[];
    items: Array<{ idx: number; topics: string[]; keywords: string[] }>;
  }>(raw, '주제 추출 실패');

  const perContent = parsed.items.map((item) => {
    const ct = c.contents[item.idx];
    return {
      contentId: ct?.id ?? '',
      topics: item.topics ?? [],
      keywords: item.keywords ?? [],
    };
  }).filter((p) => p.contentId);

  // Persist back to competitor
  const updatedContents = c.contents.map((ct) => {
    const enriched = perContent.find((p) => p.contentId === ct.id);
    return enriched ? { ...ct, topics: enriched.topics, keywords: enriched.keywords } : ct;
  });
  await competitor.updateCompetitor(competitorId, {
    contents: updatedContents,
    topic_clusters: parsed.topic_clusters,
  });

  return { topics: parsed.topic_clusters, perContent };
}

export interface GapAnalysis {
  ourTopics: string[];
  competitorTopics: string[];
  gaps: Array<{
    topic: string;
    sourceCompetitors: string[];
    suggestedKeywords: string[];
    priority: number;
  }>;
}

export async function analyzeGap(projectId: string): Promise<GapAnalysis> {
  const project = await getProject(projectId);
  const competitors = await competitor.listCompetitors(projectId);

  // Our existing topic surface
  const ourKeywords = new Set<string>();
  for (const k of project?.savedKeywords ?? []) ourKeywords.add(k.term);
  for (const i of project?.savedIdeas ?? []) {
    for (const kw of i.keywords) ourKeywords.add(kw);
  }
  const ourTopics = Array.from(ourKeywords);

  // All competitor topics
  const competitorTopicMap = new Map<string, string[]>(); // topic → competitor names
  for (const c of competitors) {
    for (const t of c.topic_clusters ?? []) {
      const arr = competitorTopicMap.get(t) ?? [];
      if (!arr.includes(c.name)) arr.push(c.name);
      competitorTopicMap.set(t, arr);
    }
  }
  const competitorTopics = Array.from(competitorTopicMap.keys());

  if (competitorTopics.length === 0) {
    return { ourTopics, competitorTopics, gaps: [] };
  }

  const prompt = `우리는 다음 키워드/주제로 콘텐츠를 만들고 있습니다:
${ourTopics.length > 0 ? ourTopics.slice(0, 30).join(', ') : '(아직 등록된 키워드 없음)'}

경쟁사들이 다루는 주제는 다음과 같습니다:
${competitorTopics.map((t) => `- ${t} (by ${competitorTopicMap.get(t)?.join(', ')})`).join('\n')}

브랜드 컨텍스트:
- 브랜드명: ${project?.brand?.name ?? '(미입력)'}
- 타겟: ${project?.brand?.targetAudience ?? '(미입력)'}
- USP: ${project?.brand?.usp ?? '(미입력)'}

우리가 다루지 않는 경쟁사 주제 중에서, 우리가 다뤄야 할 우선순위 높은 갭(gap) 5~10개를 추출하세요.
각 갭에 대해:
- topic: 주제명 (경쟁사 주제명 그대로 또는 유사하게)
- suggestedKeywords: 이 주제로 콘텐츠 만들 때 쓸 키워드 3~5개
- priority: 1(낮음) ~ 5(높음) — 우리 USP/타겟에 적합도 + 경쟁사 다수가 다루는 정도

JSON만 반환:
{"gaps": [{"topic": "...", "suggestedKeywords": ["..."], "priority": 4}]}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<{ gaps: Array<{ topic: string; suggestedKeywords: string[]; priority: number }> }>(raw, '갭 분석 실패');

  return {
    ourTopics,
    competitorTopics,
    gaps: parsed.gaps.map((g) => ({
      topic: g.topic,
      sourceCompetitors: competitorTopicMap.get(g.topic) ?? [],
      suggestedKeywords: g.suggestedKeywords ?? [],
      priority: Math.max(1, Math.min(5, Number(g.priority) || 3)),
    })).sort((a, b) => b.priority - a.priority),
  };
}
