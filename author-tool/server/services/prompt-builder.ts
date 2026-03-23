// author-tool/server/services/prompt-builder.ts

const BRAND_CONTEXT = `
브랜드: 기출노트 한능검
웹사이트: gcnote.co.kr
타겟: 한국사능력검정시험 수험생
톤: 친근하면서 신뢰감 있는 교육 콘텐츠
CTA: gcnote.co.kr에서 1,900+ 기출문제 무료 풀기
`;

export interface SourceData {
  type: 'exam' | 'note' | 'free';
  // Exam source
  examNumber?: number;
  questionNumber?: number;
  content?: string;
  choices?: string[];
  correctAnswer?: number;
  explanation?: string;
  era?: string;
  // Note source
  noteTitle?: string;
  noteHtml?: string;
  // Free source — no extra fields
}

// ─── Base Article ───
export function buildBaseArticlePrompt(source: SourceData): string {
  let sourceContext = '';
  if (source.type === 'exam') {
    sourceContext = `
[소스: 기출문제]
시험: 제${source.examNumber}회 ${source.questionNumber}번
시대: ${source.era || ''}
문제: ${source.content || ''}
선지: ${(source.choices || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}
정답: ${source.correctAnswer}번
해설: ${source.explanation || '없음'}
`;
  } else if (source.type === 'note') {
    sourceContext = `
[소스: 요약노트]
제목: ${source.noteTitle || ''}
내용 (처음 3000자):
${(source.noteHtml || '').replace(/<[^>]+>/g, ' ').slice(0, 3000)}
`;
  }

  return `${BRAND_CONTEXT}

${sourceContext}

위 소스를 바탕으로 교육용 블로그 기본글을 작성하세요.

규칙:
- HTML 형식 (h2, h3, p, ul, li 태그 사용)
- 1,500~3,000자
- 수험생이 이해하기 쉬운 문체
- "자막", "YouTube", "강의", "영상" 등 출처 언급 금지
- 핵심 키워드를 자연스럽게 포함

JSON으로 응답:
{
  "html": "...",
  "keywords": ["키워드1", "키워드2", ...],
  "summary": "한 줄 요약"
}`;
}

// ─── Blog ───
export function buildBlogPrompt(baseArticle: string, source: SourceData): string {
  return `${BRAND_CONTEXT}

[기본글]
${baseArticle}

위 기본글을 네이버 블로그에 최적화된 포스트로 변환하세요.

규칙:
- 제목: 15~25자, SEO 키워드 포함
- 본문: 2,000~3,000자
- 카드 구조: text, image, quote, list 타입 조합
- image 카드에는 imagePrompt (영어, 16:9 비율 사진 묘사) 포함
- SEO 키워드 3~5개 추출
- "자막", "YouTube", "강의", "영상" 금지

JSON으로 응답:
{
  "title": "블로그 제목",
  "seoKeywords": ["키워드1", ...],
  "cards": [
    { "type": "text", "content": "..." },
    { "type": "image", "content": "", "imagePrompt": "A historical painting of..." },
    { "type": "quote", "content": "인용문..." },
    { "type": "list", "content": "- 항목1\\n- 항목2\\n- 항목3" }
  ]
}`;
}

// ─── Card News (Instagram) ───
export function buildCardNewsPrompt(baseArticle: string, source: SourceData): string {
  // Exam source: use existing 4-slide structure
  if (source.type === 'exam') {
    return `${BRAND_CONTEXT}

[기출문제 소스]
시험: 제${source.examNumber}회 ${source.questionNumber}번
시대: ${source.era || ''}
문제: ${source.content || ''}
선지: ${(source.choices || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}
정답: ${source.correctAnswer}번
해설: ${source.explanation || '없음'}

[기본글]
${baseArticle}

인스타그램 카드뉴스 4장 슬라이드를 만드세요.

슬라이드 구조:
1. hook: 20자 이내 도발적 후킹 문구 (이모지 1개, MZ감성)
2. question: 문제 요약 + 5지선다
3. answer: 정답 + 150자 이내 해설 요약
4. cta: CTA 문구

JSON으로 응답:
{
  "caption": "인스타그램 캡션 (2~3줄)",
  "hashtags": ["#한능검", "#한국사", ...],
  "slides": [
    { "type": "hook", "textOverlay": "🔥 후킹 문구" },
    { "type": "question", "textOverlay": "Q. 문제 요약\\n① ...\\n② ...\\n③ ...\\n④ ...\\n⑤ ..." },
    { "type": "answer", "textOverlay": "정답: ②\\n해설 요약..." },
    { "type": "cta", "textOverlay": "📲 기출노트에서\\n전체 문제 풀어보기!" }
  ]
}`;
  }

  // Note/free source: flexible slides
  return `${BRAND_CONTEXT}

[기본글]
${baseArticle}

인스타그램 카드뉴스 5~8장 슬라이드를 만드세요.

규칙:
- 각 슬라이드: 짧은 텍스트 (50자 이내) + 이미지 프롬프트
- 첫 슬라이드: 후킹 (hook)
- 마지막 슬라이드: CTA
- 중간 슬라이드: content
- imagePrompt는 영어로, 1:1 정사각형, 교육 일러스트 스타일

JSON으로 응답:
{
  "caption": "인스타그램 캡션",
  "hashtags": ["#한능검", ...],
  "slides": [
    { "type": "hook", "textOverlay": "...", "imagePrompt": "..." },
    { "type": "content", "textOverlay": "...", "imagePrompt": "..." },
    ...
    { "type": "cta", "textOverlay": "📲 gcnote.co.kr" }
  ]
}`;
}

// ─── Threads ───
export function buildThreadsPrompt(baseArticle: string, source: SourceData): string {
  return `${BRAND_CONTEXT}

[기본글]
${baseArticle}

스레드(Threads) 멀티포스트를 만드세요.

규칙:
- 3~8개 포스트
- 첫 포스트: hook (호기심 유발, 이모지 활용)
- 중간: content (핵심 내용, 번호/이모지로 구조화)
- 마지막: cta (gcnote.co.kr 유도)
- 각 포스트 500자 이내
- 구어체, MZ세대 톤
- "자막", "YouTube", "강의", "영상" 금지

JSON으로 응답:
{
  "posts": [
    { "role": "hook", "text": "🔥 ..." },
    { "role": "content", "text": "..." },
    ...
    { "role": "cta", "text": "📲 ..." }
  ]
}`;
}

// ─── Long-form Script ───
export function buildLongFormPrompt(
  baseArticle: string,
  source: SourceData,
  targetDuration: string,
): string {
  return `${BRAND_CONTEXT}

[기본글]
${baseArticle}

유튜브 롱폼 영상 대본을 만드세요. 목표 길이: ${targetDuration}

규칙:
- 씬(scene) 단위로 구성
- sectionType: intro, main, transition, cta, outro
- 나레이션: 자연스러운 구어체
- 화면 지시(direction): 어떤 영상/이미지를 보여줄지
- intro에서 후킹 → main에서 본론 → cta에서 gcnote.co.kr 유도
- imagePrompt는 영어로, 16:9 비율

JSON으로 응답:
{
  "videoTitle": "영상 제목",
  "scenes": [
    { "sectionType": "intro", "title": "오프닝", "narration": "...", "direction": "...", "imagePrompt": "..." },
    { "sectionType": "main", "title": "...", "narration": "...", "direction": "...", "imagePrompt": "..." },
    ...
    { "sectionType": "cta", "title": "마무리", "narration": "...", "direction": "...", "imagePrompt": "..." }
  ]
}`;
}

// ─── Short-form Script ───
export function buildShortFormPrompt(
  baseArticle: string,
  source: SourceData,
  targetDuration: string,
): string {
  return `${BRAND_CONTEXT}

[기본글]
${baseArticle}

유튜브 쇼츠/릴스 숏폼 대본을 만드세요. 목표 길이: ${targetDuration}

규칙:
- hook (0~3초): 강렬한 한 줄
- body (3~50초): 핵심만 빠르게 전달
- cta (마지막 10초): gcnote.co.kr 유도
- direction: 화면 구성 지시
- 빠른 호흡, 자막 중심, 임팩트 있는 전달

JSON으로 응답:
{
  "hook": "...",
  "body": "...",
  "cta": "...",
  "direction": "..."
}`;
}
