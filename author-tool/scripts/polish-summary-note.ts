import fs from 'fs/promises';
import { generateText } from '../server/services/gemini.provider.js';

const CATEGORY = process.argv[2] || '정보처리산업기사';

async function main() {
  const topicsRaw = await fs.readFile(`../cbt_data/summary_notes/${CATEGORY}_topics.json`, 'utf-8');
  const topics = JSON.parse(topicsRaw);

  const topicsData = topics.slice(0, 30).map((t: any) => ({
    topic: t.topic,
    frequency: t.frequency,
    key_terms: t.allTerms.slice(0, 10),
    subtopics: t.subtopics.slice(0, 5).map((s: any) => ({
      subtopic: s.subtopic,
      frequency: s.frequency,
      concept: s.concepts.sort((a: string, b: string) => b.length - a.length)[0],
    })),
  }));

  const prompt = `당신은 ${CATEGORY} 자격시험 기본서 저자입니다.
아래는 기출문제에서 추출한 핵심 개념들입니다.
이것을 HTML 형식의 **체계적인 교과서급 요약노트**로 재구성해주세요.

## 중요: 해설이 아닌 교과서 형태로 작성
- 문제 해설 모음이 아니라, 학생이 처음 공부할 때 읽는 **기본서/교과서** 형태
- 각 주제를 체계적으로 설명하고, 관련 개념들을 논리적 흐름으로 연결
- "이 문제에서는..." 같은 해설 문체 금지. "~이다", "~한다" 교과서 문체 사용
- 기출 데이터에 정보가 부족한 주제는 **당신의 지식으로 보충**하여 교과서 수준의 충실한 내용을 작성하라
- 각 세부주제는 최소 200자 이상, 핵심 주제는 500자 이상으로 상세히 설명
- 정의, 원리, 예시, 비교, 공식 등을 풍부하게 포함

## HTML 형식 규칙
1. 대주제는 <details open><summary><strong>이모지 주제명 (출제 N회)</strong></summary> 구조
2. 세부주제는 <details class="sub-details"><summary><strong>세부주제</strong></summary> 구조
3. 핵심 용어는 <span class="highlight">용어</span>
4. 중요 키워드는 <span class="keyword">키워드</span>
5. 참고/팁은 <div class="note">💡 내용</div>
6. 비교 정보는 <table> 사용 (thead + tbody)
7. 출제 빈도가 높은 주제일수록 더 상세하게 설명
8. 중복 내용은 통합하되 빠지는 내용 없이
9. 가능한 한 길고 상세하게 작성 (토큰 아끼지 말 것)
10. 문단 사이에 적절히 줄바꿈(<br> 또는 <p> 태그)을 넣어 가독성 확보
11. 리스트(<ul>/<ol>)와 표(<table>)를 적극 활용하여 정보를 구조화

## 데이터

${JSON.stringify(topicsData, null, 2)}`;

  console.log(`✨ ${CATEGORY} 요약노트 polish 중...`);
  const model = process.argv[3] || 'gemini-2.5-flash';
  console.log(`  모델: ${model}`);
  const html = await generateText(prompt, model, { grounding: true });
  await fs.writeFile(`../cbt_data/summary_notes/${CATEGORY}_summary_polished.html`, html, 'utf-8');
  console.log(`✅ 완료! ${html.length.toLocaleString()} chars`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
