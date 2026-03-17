/**
 * Shared study view for study screens.
 *
 * Flow: select answer → "정답 확인" button → feedback + explanation + notes link → next.
 * Used by: unit, review, custom, keyword study screens.
 */
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/lib/constants';
import { Question } from '@/lib/types';
import QuestionCard from './QuestionCard';
import ChoiceList from './ChoiceList';
import NotesModal, { eraSectionId, extractKeywords } from '@/components/NotesModal';
import ExplanationSection from './ExplanationSection';

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
  /** Called to reveal the correct answer */
  onConfirm: () => void;
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
  /** Custom feedback message for correct answers (e.g., "정답! 이 문제는 해결 처리되었습니다.") */
  correctFeedbackMessage?: string;
  /** When provided, shows a "제출하기" button to finish study early */
  onSubmit?: () => void;
}

export default function StudyView({
  current,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  showResult,
  onSelect,
  onConfirm,
  onNext,
  isLastQuestion,
  progressColor = COLORS.primary,
  progressRight,
  progressSuffix,
  correctFeedbackMessage,
  onSubmit,
}: StudyViewProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [notesVisible, setNotesVisible] = useState(false);
  const isCorrect = selectedAnswer === current.correctAnswer;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
  const hasSelected = selectedAnswer != null;

  // Scroll down when result is revealed so explanation is visible
  useEffect(() => {
    if (showResult) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [showResult]);

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
        <ScrollView ref={scrollRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
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

          {/* Feedback + Explanation */}
          {showResult && (
            <ExplanationSection
              isCorrect={isCorrect}
              correctAnswer={current.correctAnswer}
              explanation={current.explanation}
              onNotesPress={() => setNotesVisible(true)}
              feedbackMessage={isCorrect && correctFeedbackMessage ? correctFeedbackMessage : undefined}
            />
          )}
        </ScrollView>

        <NotesModal
          visible={notesVisible}
          onClose={() => setNotesVisible(false)}
          sectionId={eraSectionId(current.era)}
          keywords={extractKeywords(current)}
        />

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomRow}>
            {/* Left: confirm (small) or hint */}
            {hasSelected && !showResult ? (
              <Pressable style={styles.confirmBtn} onPress={onConfirm}>
                <Ionicons name="eye" size={16} color="#fff" />
                <Text style={styles.confirmBtnText}>정답 확인</Text>
              </Pressable>
            ) : !showResult ? (
              <Text style={styles.hintText}>선지를 선택해주세요</Text>
            ) : null}

            {/* Center: submit (when available and not shown result) */}
            {onSubmit && !showResult && (
              <Pressable style={styles.submitMidBtn} onPress={onSubmit}>
                <Text style={styles.submitMidBtnText}>제출하기</Text>
              </Pressable>
            )}

            {/* Right: next/result */}
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
              <Pressable
                style={[styles.skipBtn, !hasSelected && styles.skipBtnDisabled]}
                onPress={onNext}
                disabled={!hasSelected}
              >
                <Text style={[styles.skipBtnText, !hasSelected && styles.skipBtnTextDisabled]}>
                  {isLastQuestion ? '결과 보기' : '다음'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={hasSelected ? COLORS.primary : COLORS.textLight} />
              </Pressable>
            )}
          </View>
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

  // Bottom
  bottomBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    gap: 4,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F0FF',
  },
  skipBtnDisabled: {
    opacity: 0.4,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  skipBtnTextDisabled: {
    color: COLORS.textLight,
  },
  submitMidBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  submitMidBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  nextBtn: {
    flex: 1,
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
