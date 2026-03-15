/**
 * Modal overlay that shows the summary notes (요약노트) in an iframe.
 * Accepts an optional `sectionId` to deep-link into a specific section.
 * The iframe communicates via postMessage to scroll & expand the section.
 */
import { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/lib/constants';

/** Map era string → notes.html section ID */
const ERA_TO_SECTION: Record<string, string> = {
  '선사·고조선': 's1',
  '삼국': 's1',
  '남북국': 's1',
  '고려': 's2',
  '조선 전기': 's3',
  '조선 후기': 's4',
  '근대': 's5',  // notes.html s5=근대, s6=일제강점기
  '현대': 's7',
};

export function eraSectionId(era: string): string {
  return ERA_TO_SECTION[era] || 's1';
}

/**
 * Extract search keywords from a question for sub-section matching.
 * Only uses the passage (content) and correct answer choice to extract
 * historically meaningful terms (names, events, institutions, etc.).
 */

const STOP_WORDS = new Set([
  // Question template words
  '다음', '중', '에서', '대한', '것은', '것을', '가장', '적절한',
  '옳은', '옳지', '않은', '밑줄', '그은', '이것', '이', '그', '저',
  '무엇', '어떤', '모두', '고른', '보기', '설명', '내용', '자료',
  '활동', '시기', '인물', '사건', '대해', '관한', '관련', '해당',
  '있었던', '사실로', '나타난', '전개된', '일어난', '들어갈', '해당하는',
  '배경으로', '탐구', '순서대로', '나열한', '연표', '재위',
  // Common verbs/particles
  '하였다', '되었다', '있었다', '하다', '되다', '있다', '없다',
  '위해', '통해', '대해', '따라', '의해', '위한', '통한',
  // Filler
  '문화유산으로', '모습으로', '작품으로', '제도에', '왕의', '왕에',
  '국가에', '국가의', '단체에', '정부의', '정부에', '전쟁',
]);

function extractHistoricalTerms(text: string): string[] {
  if (!text) return [];

  const terms: string[] = [];

  // 1. Extract quoted terms (e.g., '이 나라', '이 왕')
  const quoted = text.match(/[''](.*?)['']/g);
  if (quoted) {
    quoted.forEach((q) => {
      const cleaned = q.replace(/['']/g, '').trim();
      if (cleaned.length >= 2) terms.push(cleaned);
    });
  }

  // 2. Extract parenthesized terms (e.g., (가), (나) — skip, but (발해), (고려) — keep)
  const parens = text.match(/\(([가-힣]{2,})\)/g);
  if (parens) {
    parens.forEach((p) => {
      const inner = p.replace(/[()]/g, '');
      if (!['가', '나', '다', '라', '마'].includes(inner)) terms.push(inner);
    });
  }

  // 3. Extract meaningful words (2+ chars, not stop words)
  const words = text
    .replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  // Prioritize longer words (more likely proper nouns: 광개토대왕, 별무반, 집현전)
  words.sort((a, b) => b.length - a.length);
  terms.push(...words.slice(0, 5));

  return terms;
}

export function extractKeywords(question: {
  content: string;
  passage?: string;
  explanation?: string;
  choices?: string[];
  correctAnswer?: number;
  category?: string;
}): string[] {
  const keywords: string[] = [];

  // 1. From passage/content (지문) — the question stem
  keywords.push(...extractHistoricalTerms(question.content));

  // 2. From passage field if exists
  if (question.passage) {
    keywords.push(...extractHistoricalTerms(question.passage));
  }

  // 3. From correct answer choice (정답 선지)
  if (question.choices && question.correctAnswer) {
    const correctChoice = question.choices[question.correctAnswer - 1];
    if (correctChoice) {
      keywords.push(...extractHistoricalTerms(correctChoice));
    }
  }

  // 4. From explanation (해설)
  if (question.explanation) {
    keywords.push(...extractHistoricalTerms(question.explanation));
  }

  // Deduplicate, filter empty
  return [...new Set(keywords)].filter(Boolean);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** notes.html section id, e.g. "s1", "s4" */
  sectionId?: string;
  /** Keywords extracted from the question to find the best sub-section */
  keywords?: string[];
}

export default function NotesModal({ visible, onClose, sectionId, keywords }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasSentRef = useRef(false);

  // Reset sent flag when modal closes
  useEffect(() => {
    if (!visible) hasSentRef.current = false;
  }, [visible]);

  const sendScrollMessage = useCallback(() => {
    if (hasSentRef.current) return;
    if (!sectionId || !iframeRef.current?.contentWindow) return;
    hasSentRef.current = true;
    iframeRef.current.contentWindow.postMessage(
      { type: 'scrollToSection', sectionId, keywords: keywords || [] },
      '*',
    );
  }, [sectionId, keywords]);

  if (Platform.OS !== 'web') return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="newspaper-outline" size={20} color={COLORS.primary} />
            <Text style={styles.headerTitle}>요약노트</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </Pressable>
          </View>

          {/* iframe content */}
          <View style={styles.iframeWrap}>
            <iframe
              ref={(el: any) => { iframeRef.current = el; }}
              src="/summary-notes.html"
              onLoad={sendScrollMessage}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '0 0 16px 16px',
              } as any}
              title="한국사 요약노트"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 640,
    height: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F4',
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iframeWrap: {
    flex: 1,
  },
});
