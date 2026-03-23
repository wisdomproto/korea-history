/**
 * Naver SEO Scorer for blog posts (100 points total).
 * Adapted from ContentFlow's seo-scorer.ts for the author-tool BlogCard format.
 */

export interface BlogCard {
  type: 'text' | 'image' | 'quote' | 'list' | 'divider';
  content: string;
  imageUrl?: string;
}

export interface SeoDetail {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  message: string;
}

export interface SeoResult {
  score: number;
  details: SeoDetail[];
}

export interface SeoInput {
  title: string;
  cards: BlogCard[];
  primaryKeyword: string;
  secondaryKeywords: string[];
}

// ─── Helpers ───

function extractAllText(cards: BlogCard[]): string {
  return cards
    .filter((c) => c.type !== 'divider')
    .map((c) => c.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

function extractAllHtml(cards: BlogCard[]): string {
  return cards
    .filter((c) => c.type !== 'divider')
    .map((c) => c.content)
    .join(' ');
}

function countOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0;
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lower.indexOf(kw, pos)) !== -1) {
    count++;
    pos += kw.length;
  }
  return count;
}

function countHeadings(html: string): number {
  const h2 = (html.match(/<h2[\s>]/gi) ?? []).length;
  const h3 = (html.match(/<h3[\s>]/gi) ?? []).length;
  return h2 + h3;
}

function extractParagraphs(html: string): string[] {
  const matches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  return matches.map((m) => m.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function extractSentences(text: string): string[] {
  return text.split(/[.!?。]\s*/).filter((s) => s.trim().length > 0);
}

// ─── Main Scorer ───

export function calculateSeoScore(input: SeoInput): SeoResult {
  const { title, cards, primaryKeyword: primaryKw, secondaryKeywords: secondaryKws } = input;
  const details: SeoDetail[] = [];
  const allText = extractAllText(cards);
  const allHtml = extractAllHtml(cards);
  const textLen = allText.replace(/\s/g, '').length;
  const imageCards = cards.filter((c) => c.type === 'image' || (c.imageUrl && c.imageUrl.trim().length > 0));

  // ─── 1. 제목 최적화 (15점) ───
  {
    const titleLen = title.length;
    let score = 0;
    let msg = '';

    if (titleLen === 0) {
      score = 0;
      msg = '제목을 입력해 주세요';
    } else {
      // Length score (max 8)
      let lenPt = 0;
      if (titleLen >= 15 && titleLen <= 25) lenPt = 8;
      else if ((titleLen >= 10 && titleLen < 15) || (titleLen > 25 && titleLen <= 35)) lenPt = 5;
      else lenPt = 2;

      // Primary keyword in title (max 5)
      let kwPt = 0;
      if (primaryKw) {
        const inTitle = title.toLowerCase().includes(primaryKw.toLowerCase());
        if (inTitle) {
          kwPt = 3;
          const kwPos = title.toLowerCase().indexOf(primaryKw.toLowerCase());
          if (kwPos <= Math.floor(titleLen / 3)) kwPt = 5;
        }
      }

      // Secondary keyword in title (max 2)
      let secPt = 0;
      if (secondaryKws.length > 0) {
        const secInTitle = secondaryKws.some((kw) => title.toLowerCase().includes(kw.toLowerCase()));
        if (secInTitle) secPt = 2;
      }

      score = Math.min(15, lenPt + kwPt + secPt);
      const parts: string[] = [`${titleLen}자`];
      if (titleLen >= 15 && titleLen <= 25) parts.push('길이 최적');
      else parts.push('15~25자 권장');
      if (primaryKw && kwPt >= 3) parts.push('키워드 포함');
      else if (primaryKw) parts.push('키워드 미포함');
      msg = parts.join(', ');
    }
    details.push({ category: 'title', label: '제목 최적화', score, maxScore: 15, message: msg });
  }

  // ─── 2. 키워드 밀도 (15점) ───
  {
    let score = 0;
    let msg = '';
    if (!primaryKw) {
      score = 0;
      msg = '주요 키워드를 설정해 주세요';
    } else {
      const count = countOccurrences(allText, primaryKw);
      const density = textLen > 0 ? (count * primaryKw.length / textLen) * 100 : 0;

      // Count score (max 10)
      let countPt = 0;
      if (density >= 1 && density <= 2) countPt = 10;
      else if (density >= 0.5 && density < 1) countPt = 7;
      else if (density > 2 && density <= 3) countPt = 6;
      else if (count >= 1) countPt = 3;

      // Secondary keywords (max 5)
      let secPt = 0;
      if (secondaryKws.length > 0) {
        const secFound = secondaryKws.filter((kw) => countOccurrences(allText, kw) >= 1).length;
        secPt = Math.min(5, Math.round((secFound / secondaryKws.length) * 5));
      }

      score = Math.min(15, countPt + secPt);
      msg = `"${primaryKw}" ${count}회 (밀도 ${density.toFixed(1)}%)`;
      if (density < 1) msg += ' — 빈도 부족';
      else if (density > 2) msg += ' — 과다 사용';
    }
    details.push({ category: 'keyword-density', label: '키워드 밀도', score, maxScore: 15, message: msg });
  }

  // ─── 3. 콘텐츠 길이 (10점) ───
  {
    let score = 0;
    let msg = '';
    if (textLen === 0) {
      score = 0; msg = '본문을 작성해 주세요';
    } else if (textLen >= 2000 && textLen <= 3000) {
      score = 10; msg = `${textLen}자 (최적)`;
    } else if (textLen >= 1500 && textLen < 2000) {
      score = 7; msg = `${textLen}자 (2,000자 이상 권장)`;
    } else if (textLen > 3000 && textLen <= 4000) {
      score = 8; msg = `${textLen}자 (약간 김)`;
    } else if (textLen >= 800 && textLen < 1500) {
      score = 4; msg = `${textLen}자 (2,000~3,000자 권장)`;
    } else if (textLen > 4000) {
      score = 6; msg = `${textLen}자 (3,000자 이하 권장)`;
    } else {
      score = 2; msg = `${textLen}자 (2,000~3,000자 권장)`;
    }
    details.push({ category: 'content-length', label: '콘텐츠 길이', score, maxScore: 10, message: msg });
  }

  // ─── 4. 구조화 (15점) ───
  {
    const totalHeadings = countHeadings(allHtml);
    const paragraphs = extractParagraphs(allHtml);
    const listCards = cards.filter((c) => c.type === 'list');
    const hasList = listCards.length > 0 || /<(ul|ol)[\s>]/i.test(allHtml);

    // Headings (max 7)
    let headingPt = 0;
    if (totalHeadings >= 3) headingPt = 7;
    else if (totalHeadings >= 2) headingPt = 5;
    else if (totalHeadings >= 1) headingPt = 3;

    // Paragraph quality (max 5)
    let paraPt = 0;
    if (paragraphs.length >= 3) {
      const goodParas = paragraphs.filter((p) => {
        const len = p.replace(/\s/g, '').length;
        return len >= 200 && len <= 600;
      }).length;
      paraPt = Math.min(5, Math.round((goodParas / paragraphs.length) * 5));
    } else if (paragraphs.length > 0) {
      paraPt = 2;
    }

    // Lists (max 3)
    const listPt = hasList ? 3 : 0;

    const score = Math.min(15, headingPt + paraPt + listPt);
    const parts: string[] = [];
    parts.push(`소제목 ${totalHeadings}개`);
    if (totalHeadings < 3) parts.push('3개 이상 권장');
    parts.push(`단락 ${paragraphs.length}개`);
    if (hasList) parts.push('리스트 사용');
    details.push({ category: 'structure', label: '구조화', score, maxScore: 15, message: parts.join(', ') });
  }

  // ─── 5. 이미지 (10점) ───
  {
    const imgCount = imageCards.length;

    // Image count (max 10): 6-13 optimal
    let score = 0;
    if (imgCount >= 6 && imgCount <= 13) score = 10;
    else if (imgCount >= 3 && imgCount < 6) score = 6;
    else if (imgCount > 13) score = 6;
    else if (imgCount >= 1) score = 3;

    let msg = `${imgCount}개 이미지`;
    if (imgCount < 6) msg += ' (6~13장 권장)';
    else if (imgCount > 13) msg += ' (너무 많음)';
    details.push({ category: 'image', label: '이미지', score, maxScore: 10, message: msg });
  }

  // ─── 6. 첫 문단 임팩트 (10점) ───
  {
    const first150 = allText.substring(0, 150);
    let score = 0;
    const parts: string[] = [];

    if (first150.length < 50) {
      score = 0;
      parts.push('본문이 너무 짧음');
    } else {
      // Keyword in first 150 chars (5pt)
      if (primaryKw && first150.toLowerCase().includes(primaryKw.toLowerCase())) {
        score += 5;
        parts.push('키워드 포함');
      } else if (primaryKw) {
        parts.push('첫 150자에 키워드 필요');
      }

      // Sufficient length (3pt)
      if (first150.length >= 100) {
        score += 3;
      } else {
        parts.push('도입부 보강 필요');
      }

      // Title-body relevance (2pt)
      if (title) {
        const titleWords = title.split(/\s+/).filter((w) => w.length >= 2);
        const matchCount = titleWords.filter((w) => first150.toLowerCase().includes(w.toLowerCase())).length;
        if (titleWords.length > 0 && matchCount / titleWords.length >= 0.3) {
          score += 2;
          parts.push('제목-도입부 연관');
        }
      }
    }

    details.push({ category: 'first-paragraph', label: '첫 문단 임팩트', score: Math.min(10, score), maxScore: 10, message: parts.join(', ') || '양호' });
  }

  // ─── 7. 검색 의도 매칭 (10점) ───
  {
    let score = 0;
    const parts: string[] = [];

    // Title-body keyword match (5pt)
    if (title && allText) {
      const titleWords = title.split(/\s+/).filter((w) => w.length >= 2);
      const bodyLower = allText.toLowerCase();
      const matchCount = titleWords.filter((w) => bodyLower.includes(w.toLowerCase())).length;
      if (titleWords.length > 0) {
        const ratio = matchCount / titleWords.length;
        if (ratio >= 0.5) { score += 5; parts.push('제목-본문 일치'); }
        else if (ratio >= 0.3) { score += 3; parts.push('부분 일치'); }
      }
    }

    // Q&A structure (3pt)
    const hasQuestion = /[?？]/.test(allHtml) || /<h[23][^>]*>.*[?？]/.test(allHtml);
    if (hasQuestion) { score += 3; parts.push('Q&A 구조'); }

    // Conclusion/summary (2pt)
    const lastCardText = cards.length > 0 ? extractAllText([cards[cards.length - 1]]) : '';
    const hasConclusion = /결론|요약|마무리|정리|마치며/.test(lastCardText) || /<h[23][^>]*>.*(?:결론|요약|마무리|정리|마치며)/.test(allHtml);
    if (hasConclusion) { score += 2; parts.push('결론 포함'); }

    details.push({ category: 'search-intent', label: '검색 의도 매칭', score: Math.min(10, score), maxScore: 10, message: parts.join(', ') || '개선 필요' });
  }

  // ─── 8. 모바일 가독성 (10점) ───
  {
    const sentences = extractSentences(allText);
    let score = 0;
    const parts: string[] = [];

    if (sentences.length === 0) {
      score = 0;
      parts.push('본문 없음');
    } else {
      // Sentences <= 60 chars (max 5pt)
      const shortSentences = sentences.filter((s) => s.length <= 60).length;
      const shortRatio = shortSentences / sentences.length;
      if (shortRatio >= 0.7) { score += 5; parts.push('문장 길이 양호'); }
      else if (shortRatio >= 0.5) { score += 3; parts.push('일부 문장 길이 초과'); }
      else { score += 1; parts.push('문장 60자 이내 권장'); }

      // Short paragraphs (max 5pt)
      const paragraphs = extractParagraphs(allHtml);
      if (paragraphs.length >= 3) {
        const shortParas = paragraphs.filter((p) => p.replace(/\s/g, '').length <= 500).length;
        const paraRatio = shortParas / paragraphs.length;
        if (paraRatio >= 0.8) { score += 5; }
        else if (paraRatio >= 0.5) { score += 3; }
        else { score += 1; parts.push('단락 500자 이내 권장'); }
      } else {
        score += 2;
      }
    }

    details.push({ category: 'mobile-readability', label: '모바일 가독성', score: Math.min(10, score), maxScore: 10, message: parts.join(', ') || '양호' });
  }

  // ─── 9. 메타 정보 (5점) ───
  {
    let score = 0;
    const parts: string[] = [];

    if (title.trim()) { score += 2; parts.push('SEO 제목 설정'); }
    else parts.push('SEO 제목 필요');

    if (primaryKw) { score += 2; parts.push('키워드 설정'); }
    else parts.push('키워드 필요');

    if (secondaryKws.length >= 2) { score += 1; parts.push(`보조 ${secondaryKws.length}개`); }
    else if (secondaryKws.length > 0) parts.push('보조 키워드 2개 이상 권장');

    details.push({ category: 'meta', label: '메타 정보', score: Math.min(5, score), maxScore: 5, message: parts.join(', ') });
  }

  const totalScore = details.reduce((sum, d) => sum + d.score, 0);
  return { score: totalScore, details };
}
