import { generateText, parseJSON } from './gemini.provider.js';

interface GenerateRequest {
  era: string;
  category: string;
  difficulty: 1 | 2 | 3;
  points: number;
  count: number;
  topic?: string;
  model?: string;
}

interface GeneratedQuestion {
  content: string;
  choices: [string, string, string, string, string];
  correctAnswer: number;
  points: number;
  era: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '기초 (한국사능력검정시험 기본 수준)',
  2: '중급 (한국사능력검정시험 심화 수준)',
  3: '심화 (고급 지식 필요)',
};

function buildPrompt(era: string, category: string, difficulty: number, points: number, count: number, topic?: string): string {
  return `당신은 한국사능력검정시험 출제 전문가입니다.
다음 조건에 맞는 한국사 시험 문제를 정확히 ${count}개 생성하세요.

[출제 조건]
- 시대: ${era}
- 분야: ${category}
- 난이도: ${difficulty} — ${DIFFICULTY_LABELS[difficulty]}
- 배점: ${points}점
${topic ? `- 주제/키워드: ${topic}` : ''}

[형식 규칙]
1. 선지는 반드시 5개 (배열 길이 5)
2. correctAnswer는 1~5 중 하나 (정답 번호)
3. content: 질문 텍스트만 작성. 예) "(가) 왕의 업적으로 옳은 것은?"
4. 역사적 사실에 정확히 기반할 것. 오답 선지도 그럴듯하지만 명확히 틀린 내용으로.
5. 각 문제의 era는 "${era}", category는 "${category}", difficulty는 ${difficulty}, points는 ${points}으로 고정.

[출제 유의사항]
- 단순 암기보다 사료 해석, 시대 추론, 인과관계 파악 문제를 선호
- 오답 선지는 다른 시대·인물의 사실을 활용 (매력적 오답)
- 문제마다 다른 주제/인물/사건을 다룰 것 (중복 방지)

JSON 배열로만 응답하세요 (설명 없이):
[
  {
    "content": "문제 본문",
    "choices": ["①", "②", "③", "④", "⑤"],
    "correctAnswer": 3,
    "points": ${points},
    "era": "${era}",
    "category": "${category}",
    "difficulty": ${difficulty}
  }
]`;
}

export const GeneratorService = {
  async generate(req: GenerateRequest): Promise<GeneratedQuestion[]> {
    const { era, category, difficulty, points, count, topic, model } = req;
    const prompt = buildPrompt(era, category, difficulty, points, count, topic);
    const raw = await generateText(prompt, model);
    return parseJSON<GeneratedQuestion[]>(raw, '문제 생성 결과 파싱 실패');
  },

  async generateSingle(req: Omit<GenerateRequest, 'count'>): Promise<GeneratedQuestion> {
    const result = await GeneratorService.generate({ ...req, count: 1 });
    if (!result.length) throw new Error('문제가 생성되지 않았습니다.');
    return result[0];
  },
};
