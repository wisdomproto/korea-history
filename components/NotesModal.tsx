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
 * Pulls key terms from content, explanation, and correct choice.
 */
export function extractKeywords(question: {
  content: string;
  explanation?: string;
  choices?: string[];
  correctAnswer?: number;
  category?: string;
}): string[] {
  const parts: string[] = [];

  // Add category
  if (question.category) parts.push(question.category);

  // Extract quoted terms from content (e.g., '이 시대', '밑줄 그은')
  const quoted = question.content.match(/[''](.*?)['']/g);
  if (quoted) {
    quoted.forEach((q) => parts.push(q.replace(/['']/g, '')));
  }

  // Key historical terms — extract nouns/proper nouns from content
  // Remove common filler words and keep substantive terms
  const STOP_WORDS = new Set([
    '다음', '중', '에서', '대한', '것은', '것을', '가장', '적절한',
    '옳은', '옳지', '않은', '밑줄', '그은', '이것', '이', '그', '저',
    '무엇', '어떤', '모두', '고른', '보기', '설명', '내용', '자료',
    '활동', '시기', '인물', '사건', '대해', '관한', '관련', '해당',
  ]);

  const contentWords = question.content
    .replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  // Take top meaningful words (longer words are more likely to be proper nouns)
  const sorted = contentWords.sort((a, b) => b.length - a.length);
  parts.push(...sorted.slice(0, 5));

  // Add correct answer choice text
  if (question.choices && question.correctAnswer) {
    const correctChoice = question.choices[question.correctAnswer - 1];
    if (correctChoice) {
      const choiceWords = correctChoice
        .replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
      parts.push(...choiceWords.slice(0, 3));
    }
  }

  // Deduplicate
  return [...new Set(parts)].filter(Boolean);
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
