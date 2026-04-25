import { generateText, parseJSON } from './gemini.provider.js';
import { getProject } from './project.service.js';
import type {
  CommentSentiment,
  CommentIntent,
  MonitoredComment,
} from './monitored-comments.service.js';

export interface AnalysisResult {
  sentiment: CommentSentiment;
  sentimentConfidence: number; // 0~1
  intent: CommentIntent;
  replyDraft: string;
}

function buildBrandBlock(project: Awaited<ReturnType<typeof getProject>>): string {
  if (!project) return '';
  const b = project.brand ?? {};
  const parts: string[] = [];
  if (b.name) parts.push(`브랜드: ${b.name}`);
  if (b.tone) parts.push(`브랜드 톤: ${b.tone}`);
  if (b.marketerName) parts.push(`담당자: ${b.marketerName}`);
  if (b.marketerStyle) parts.push(`담당자 문체: ${b.marketerStyle}`);
  if (b.bannedKeywords?.length) parts.push(`금지 표현: ${b.bannedKeywords.join(', ')}`);
  return parts.join('\n');
}

export async function analyzeAndDraft(
  comment: Pick<MonitoredComment, 'text' | 'author' | 'post_title' | 'channel' | 'project_id'>
): Promise<AnalysisResult> {
  const project = await getProject(comment.project_id);
  const brand = buildBrandBlock(project);

  const prompt = `다음 댓글에 대해 ①감정 ②의도 ③브랜드 답글 초안을 작성하세요.

${brand ? `브랜드 컨텍스트:\n${brand}\n\n` : ''}원본 포스트 제목: ${comment.post_title ?? '(없음)'}
채널: ${comment.channel}
작성자: @${comment.author}
댓글: "${comment.text}"

규칙:
- 감정 sentiment: positive / neutral / negative 중 하나
- sentimentConfidence: 0~1 float
- 의도 intent: question / complaint / compliment / spam / other 중 하나
- 답글 replyDraft:
  - 2~3문장 이내, 이모지 1개 이하
  - "@${comment.author}" 로 시작
  - 브랜드 톤 유지, 금지 표현 절대 사용 금지
  - 스팸이면 답글 불필요 → 빈 문자열

JSON만 반환:
{"sentiment": "...", "sentimentConfidence": 0.0, "intent": "...", "replyDraft": "..."}`;

  const raw = await generateText(prompt);
  const result = parseJSON<AnalysisResult>(raw, '댓글 분석 실패');
  return {
    sentiment: result.sentiment,
    sentimentConfidence: Math.max(0, Math.min(1, Number(result.sentimentConfidence) || 0)),
    intent: result.intent,
    replyDraft: result.replyDraft ?? '',
  };
}
