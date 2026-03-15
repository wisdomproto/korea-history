/**
 * Reusable explanation section: feedback badge + explanation text + notes link.
 * Used in CBT exam, study mode, and review screens after answer reveal.
 */
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/lib/constants';

interface Props {
  isCorrect: boolean;
  correctAnswer: number;
  explanation?: string;
  onNotesPress: () => void;
  /** Custom feedback message (overrides default) */
  feedbackMessage?: string;
}

export default function ExplanationSection({
  isCorrect,
  correctAnswer,
  explanation,
  onNotesPress,
  feedbackMessage,
}: Props) {
  const defaultMessage = isCorrect ? '정답!' : `오답! 정답은 ${correctAnswer}번`;

  return (
    <>
      {/* Feedback badge */}
      <View style={[styles.feedbackBox, isCorrect ? styles.correctFeedback : styles.wrongFeedback]}>
        <Ionicons
          name={isCorrect ? 'checkmark-circle' : 'close-circle'}
          size={20}
          color={isCorrect ? '#16A34A' : '#DC2626'}
        />
        <Text style={[styles.feedbackText, { color: isCorrect ? '#16A34A' : '#DC2626' }]}>
          {feedbackMessage ?? defaultMessage}
        </Text>
      </View>

      {/* Explanation */}
      {explanation ? (
        <View style={styles.explanationBox}>
          <View style={styles.explanationHeader}>
            <Ionicons name="bulb" size={18} color={COLORS.primary} />
            <Text style={styles.explanationTitle}>해설</Text>
          </View>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      ) : null}

      {/* Notes link */}
      <Pressable style={styles.notesLink} onPress={onNotesPress}>
        <Ionicons name="newspaper-outline" size={18} color={COLORS.primary} />
        <Text style={styles.notesLinkText}>요약노트 바로가기</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  feedbackBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  correctFeedback: {
    backgroundColor: '#F0FDF4',
  },
  wrongFeedback: {
    backgroundColor: '#FEF2F2',
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanationBox: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F8F7FF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8E8F4',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  explanationText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  notesLink: {
    marginTop: 12,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8E8F4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.sm,
  },
  notesLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
