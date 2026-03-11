/**
 * Shared study view for instant-feedback study screens.
 *
 * Renders: progress bar → QuestionCard → ChoiceList → feedback → bottom bar.
 * Used by: unit, review, custom, keyword study screens.
 */
import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/lib/constants';
import { Question } from '@/lib/types';
import QuestionCard from './QuestionCard';
import ChoiceList from './ChoiceList';

interface StudyViewProps {
  /** Current question to display */
  current: Question;
  /** Zero-based index of the current question */
  currentIndex: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Currently selected answer (1-5 or null) */
  selectedAnswer: number | null;
  /** Whether to show correct/wrong feedback */
  showResult: boolean;
  /** Called when a choice is selected */
  onSelect: (choice: number) => void;
  /** Called when "next" or "view results" is pressed */
  onNext: () => void;
  /** Whether this is the last question */
  isLastQuestion: boolean;

  // ── Customization ──

  /** Progress bar fill color (default: COLORS.primary) */
  progressColor?: string;
  /** Extra node rendered to the right of progress text (e.g., correct count) */
  progressRight?: React.ReactNode;
  /** Extra text appended to the default progress text (e.g., wrong count) */
  progressSuffix?: string;
  /** Custom feedback renderer. When omitted, uses the default feedback box. */
  renderFeedback?: (isCorrect: boolean, correctAnswer: number) => React.ReactNode;
}

export default function StudyView({
  current,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  showResult,
  onSelect,
  onNext,
  isLastQuestion,
  progressColor = COLORS.primary,
  progressRight,
  progressSuffix,
  renderFeedback,
}: StudyViewProps) {
  const isCorrect = selectedAnswer === current.correctAnswer;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {totalQuestions}
              {progressSuffix ? ` ${progressSuffix}` : ''}
            </Text>
            {progressRight}
          </View>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%`, backgroundColor: progressColor },
              ]}
            />
          </View>
        </View>

        {/* Scrollable content */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <QuestionCard
            question={current}
            questionIndex={currentIndex}
            totalQuestions={totalQuestions}
          />

          <ChoiceList
            choices={current.choices}
            choiceImages={current.choiceImages}
            selectedAnswer={selectedAnswer}
            onSelect={onSelect}
            correctAnswer={current.correctAnswer}
            showResult={showResult}
          />

          {/* Feedback */}
          {showResult && (
            renderFeedback ? (
              renderFeedback(isCorrect, current.correctAnswer)
            ) : (
              <View
                style={[
                  styles.feedbackBox,
                  isCorrect ? styles.correctFeedback : styles.wrongFeedback,
                ]}
              >
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={isCorrect ? '#16A34A' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    { color: isCorrect ? '#16A34A' : '#DC2626' },
                  ]}
                >
                  {isCorrect ? '정답!' : `오답! 정답은 ${current.correctAnswer}번`}
                </Text>
              </View>
            )
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          {showResult ? (
            <Pressable style={styles.nextBtn} onPress={onNext}>
              <Text style={styles.nextBtnText}>
                {isLastQuestion ? '결과 보기' : '다음 문항'}
              </Text>
              {!isLastQuestion && (
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              )}
            </Pressable>
          ) : (
            <Text style={styles.hintText}>선지를 선택하면 즉시 정답을 확인합니다</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentWrap: {
    flex: 1,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center' as const,
  },

  // Progress
  progressBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  progressBg: {
    height: 5,
    backgroundColor: '#F1F0FF',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Scroll
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Feedback
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

  // Bottom
  bottomBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    gap: 6,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});
