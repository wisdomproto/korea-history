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
- 8~15개 카드로 구성
- 모든 카드에 content(본문 텍스트)와 imagePrompt(영어, 16:9 비율 사진 묘사)를 반드시 포함
- content는 200~400자 분량의 충실한 본문
- SEO 키워드 3~5개 추출
- "자막", "YouTube", "강의", "영상" 금지

JSON으로 응답:
{
  "title": "블로그 제목",
  "seoKeywords": ["키워드1", ...],
  "cards": [
    { "type": "text", "content": "본문 텍스트 (200~400자)", "imagePrompt": "A detailed photo of..." },
    { "type": "text", "content": "다음 섹션 본문 텍스트", "imagePrompt": "A historical illustration of..." }
  ]
}`;
}

// ─── Card News (Instagram) ───
export function buildCardNewsPrompt(baseArticle: string, source: SourceData): string {
  let sourceContext = '';
  if (source.type === 'exam') {
    sourceContext = `
[기출문제 소스]
시험: 제${source.examNumber}회 ${source.questionNumber}번
시대: ${source.era || ''}
문제: ${source.content || ''}
선지: ${(source.choices || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}
정답: ${source.correctAnswer}번
해설: ${source.explanation || '없음'}
`;
  }

  return `${BRAND_CONTEXT}
${sourceContext}
[기본글]
${baseArticle}

인스타그램 카드뉴스 5~8장 슬라이드를 만드세요.

## 슬라이드 텍스트 구조
각 슬라이드는 반드시 2개 텍스트 영역을 가집니다:
- title: 메인 제목 (15~25자, 핵심 메시지, 이모지 1개 포함 가능)
- body: 본문 설명 (50~100자, 완전한 문장으로 이미지 없이 읽어도 이해되는 내용)

## 규칙
- 첫 슬라이드: hook (호기심 유발, MZ감성)
- 마지막 슬라이드: CTA (gcnote.co.kr 유도)
- 중간 슬라이드: 핵심 내용을 한 장에 하나씩
- body는 키워드 나열이 아닌 완전한 문장으로 작성
- imagePrompt는 영어로, 4:5 비율, 모든 슬라이드가 동일한 색감/일러스트 스타일 유지
- "자막", "YouTube", "강의", "영상" 금지

JSON으로 응답:
{
  "caption": "인스타그램 캡션 (2~3줄, 핵심 요약 + CTA)",
  "hashtags": ["#한능검", "#한국사", "#기출노트", ...],
  "slides": [
    {
      "type": "hook",
      "title": "🔥 이거 모르면 시험 망한다",
      "body": "매 시험마다 출제되는 핵심 주제를 정리했습니다. 스와이프해서 확인하세요!",
      "imagePrompt": "Warm-toned flat illustration of a Korean historical scroll..."
    }
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
