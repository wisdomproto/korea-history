import { Question } from './types';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface ExplanationResult {
  correctExplanation: string;
  wrongExplanations: Record<number, string>; // choiceNumber -> explanation
}

export async function generateExplanation(
  question: Question,
  userAnswer: number | null,
): Promise<ExplanationResult> {
  if (!API_KEY || API_KEY === '여기에_API_키를_입력하세요') {
    return getFallbackExplanation(question);
  }

  const prompt = buildPrompt(question, userAnswer);

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      console.warn('Gemini API error:', response.status);
      return getFallbackExplanation(question);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return getFallbackExplanation(question);
    }

    return parseExplanation(text, question);
  } catch (error) {
    console.warn('Gemini API call failed:', error);
    return getFallbackExplanation(question);
  }
}

function buildPrompt(question: Question, userAnswer: number | null): string {
  const choicesText = question.choices
    .map((c, i) => `${i + 1}번: ${c}`)
    .join('\n');

  return `한국사능력검정시험 문제의 해설을 작성해주세요.

[문제]
${question.content}

[선지]
${choicesText}

[정답] ${question.correctAnswer}번
[사용자 답] ${userAnswer ? `${userAnswer}번` : '미응답'}
[시대] ${question.era}
[유형] ${question.category}

다음 JSON 형식으로만 답변해주세요 (다른 텍스트 없이):
{
  "correctExplanation": "정답인 ${question.correctAnswer}번이 맞는 이유를 2-3문장으로 설명",
  "wrongExplanations": {
    "1": "1번 선지가 틀린 이유 (정답 선지는 빈 문자열)",
    "2": "2번 선지가 틀린 이유 (정답 선지는 빈 문자열)",
    "3": "3번 선지가 틀린 이유 (정답 선지는 빈 문자열)",
    "4": "4번 선지가 틀린 이유 (정답 선지는 빈 문자열)"
  }
}`;
}

function parseExplanation(text: string, question: Question): ExplanationResult {
  try {
    // JSON 블록 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      correctExplanation: parsed.correctExplanation || '해설을 불러올 수 없습니다.',
      wrongExplanations: parsed.wrongExplanations || {},
    };
  } catch {
    // 파싱 실패 시 텍스트 전체를 정답 해설로 사용
    return {
      correctExplanation: text.slice(0, 500),
      wrongExplanations: {},
    };
  }
}

function getFallbackExplanation(question: Question): ExplanationResult {
  return {
    correctExplanation: `정답은 ${question.correctAnswer}번입니다. 이 문제는 ${question.era} 시대의 ${question.category} 분야에 해당하는 문제입니다. API 키가 설정되지 않아 상세 해설을 제공할 수 없습니다. .env 파일에 EXPO_PUBLIC_GEMINI_API_KEY를 설정해주세요.`,
    wrongExplanations: {},
  };
}
