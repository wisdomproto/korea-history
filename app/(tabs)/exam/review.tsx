import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { Question } from '@/lib/types';
import { getWrongNotes, resolveWrongNote, WrongNote } from '@/lib/storage';
import { fetchQuestionById } from '@/lib/examData';
import QuestionCard from '@/components/exam/QuestionCard';
import ChoiceList from '@/components/exam/ChoiceList';

interface ReviewQuestion {
  question: Question;
  wrongNote: WrongNote;
}

export default function ReviewScreen() {
  const router = useRouter();
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const notes = await getWrongNotes();
      const unresolved = notes.filter((n) => !n.isResolved);
      const questions: ReviewQuestion[] = [];
      for (const note of unresolved) {
        const q = await fetchQuestionById(note.questionId);
        if (q) questions.push({ question: q, wrongNote: note });
      }
      // Sort by wrongCount desc (most problematic first)
      questions.sort((a, b) => b.wrongNote.wrongCount - a.wrongNote.wrongCount);
      setReviewQuestions(questions);
      setLoaded(true);
    })();
  }, []);

  const current = reviewQuestions[currentIndex];

  const handleSelect = useCallback((choice: number) => {
    if (showResult) return;
    setSelectedAnswer(choice);
    setShowResult(true);

    if (current && choice === current.question.correctAnswer) {
      setCorrectCount((c) => c + 1);
      // Mark as resolved
      resolveWrongNote(current.wrongNote.questionId, current.wrongNote.examId);
    }
  }, [showResult, current]);

  const handleNext = useCallback(() => {
    if (currentIndex < reviewQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  }, [currentIndex, reviewQuestions.length]);

  if (!loaded) return null;

  if (reviewQuestions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: '오답 복습' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>복습할 오답이 없습니다!</Text>
          <Text style={styles.emptyDesc}>모의고사를 풀면 틀린 문제가 여기에 표시됩니다.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (completed) {
    return (
      <>
        <Stack.Screen options={{ title: '복습 결과' }} />
        <View style={styles.resultContainer}>
          <Text style={styles.resultIcon}>{correctCount === reviewQuestions.length ? '🎉' : '💪'}</Text>
          <Text style={styles.resultTitle}>복습 완료!</Text>
          <Text style={styles.resultScore}>
            {reviewQuestions.length}문항 중 {correctCount}문항 정답
          </Text>
          <Text style={styles.resultDesc}>
            {correctCount === reviewQuestions.length
              ? '모든 문제를 맞혔습니다! 오답이 해결되었습니다.'
              : `${reviewQuestions.length - correctCount}문항은 아직 미해결 상태입니다. 다시 도전해보세요!`}
          </Text>
          <View style={styles.resultActions}>
            <Pressable style={styles.actionBtn} onPress={() => router.back()}>
              <Text style={styles.actionBtnText}>돌아가기</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => {
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setShowResult(false);
                setCorrectCount(0);
                setCompleted(false);
              }}
            >
              <Text style={styles.primaryBtnText}>다시 복습</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '오답 복습' }} />
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {reviewQuestions.length} (틀린 횟수: {current.wrongNote.wrongCount}회)
          </Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${((currentIndex + 1) / reviewQuestions.length) * 100}%` }]} />
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <QuestionCard
            question={current.question}
            questionIndex={currentIndex}
            totalQuestions={reviewQuestions.length}
          />

          {/* Choices with instant feedback */}
          <View style={styles.choicesSection}>
            {current.question.choices.map((choice, idx) => {
              const num = idx + 1;
              const isCorrect = num === current.question.correctAnswer;
              const isSelected = num === selectedAnswer;
              const isWrong = showResult && isSelected && !isCorrect;

              return (
                <Pressable
                  key={num}
                  style={[
                    styles.choiceItem,
                    showResult && isCorrect && styles.correctChoice,
                    isWrong && styles.wrongChoice,
                    !showResult && isSelected && styles.selectedChoice,
                  ]}
                  onPress={() => handleSelect(num)}
                  disabled={showResult}
                >
                  <Text style={[
                    styles.choiceNum,
                    showResult && isCorrect && styles.correctText,
                    isWrong && styles.wrongText,
                  ]}>
                    {showResult && isCorrect ? '✓' : showResult && isWrong ? '✗' : `${num}`}
                  </Text>
                  <Text style={[
                    styles.choiceText,
                    showResult && isCorrect && styles.correctText,
                    isWrong && styles.wrongText,
                  ]}>
                    {choice}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Feedback message */}
          {showResult && (
            <View style={[styles.feedbackBox, selectedAnswer === current.question.correctAnswer ? styles.correctFeedback : styles.wrongFeedback]}>
              <Text style={styles.feedbackText}>
                {selectedAnswer === current.question.correctAnswer
                  ? '✅ 정답! 이 문제는 해결 처리되었습니다.'
                  : `❌ 오답! 정답은 ${current.question.correctAnswer}번입니다.`}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottomBar}>
          {showResult ? (
            <Pressable style={[styles.nextBtn, styles.primaryBtn]} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>
                {currentIndex < reviewQuestions.length - 1 ? '다음 문항 ▶' : '결과 보기'}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.hintText}>선지를 선택하면 즉시 정답이 확인됩니다</Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  progressBar: { padding: 16, paddingBottom: 8 },
  progressText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '500' },
  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },

  choicesSection: { gap: 8 },
  choiceItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: COLORS.border,
  },
  selectedChoice: { borderColor: COLORS.primary, backgroundColor: '#F0F7FF' },
  correctChoice: { borderColor: COLORS.success, backgroundColor: '#F1F8F1' },
  wrongChoice: { borderColor: COLORS.danger, backgroundColor: '#FFF5F5' },
  choiceNum: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center', marginRight: 10 },
  choiceText: { fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 },
  correctText: { color: COLORS.success, fontWeight: '600' },
  wrongText: { color: COLORS.danger },

  feedbackBox: { marginTop: 16, padding: 14, borderRadius: 10 },
  correctFeedback: { backgroundColor: '#E8F5E9' },
  wrongFeedback: { backgroundColor: '#FFEBEE' },
  feedbackText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },

  bottomBar: {
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
  },
  nextBtn: { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtn: { backgroundColor: COLORS.primary },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hintText: { fontSize: 13, color: COLORS.textLight },

  resultContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  resultIcon: { fontSize: 56, marginBottom: 16 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  resultScore: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginBottom: 12 },
  resultDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  resultActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
});
