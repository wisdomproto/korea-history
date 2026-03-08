import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { useExamWithQuestions } from '@/hooks/useExamData';
import { UserAnswer, Question } from '@/lib/types';
import { generateExplanation } from '@/lib/gemini';
import { getCachedExplanation, cacheExplanation, saveFeedback, getFeedback, CachedExplanation, canViewExplanation, markExplanationViewed } from '@/lib/storage';

export default function ExplanationScreen() {
  const params = useLocalSearchParams<{
    examId: string;
    answers: string;
    filter: string; // 'all' | 'wrong'
  }>();
  const router = useRouter();

  const { data: { exam, questions }, isLoading: dataLoading } = useExamWithQuestions(Number(params.examId));

  let userAnswers: UserAnswer[] = [];
  try {
    userAnswers = JSON.parse(params.answers || '[]');
  } catch {}

  const showWrongOnly = params.filter === 'wrong';

  // 필터링된 문제 목록
  const filteredQuestions = showWrongOnly
    ? questions.filter((q) => {
        const a = userAnswers.find((a) => a.questionId === q.id);
        return a && !a.isCorrect;
      })
    : questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [explanation, setExplanation] = useState<CachedExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'good' | 'bad' | null>(null);
  const [showWrongDetails, setShowWrongDetails] = useState<Record<number, boolean>>({});
  const [isLocked, setIsLocked] = useState(false); // US-22: 프리미엄 잠금

  const currentQuestion = filteredQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? userAnswers.find((a) => a.questionId === currentQuestion.id)
    : null;

  const loadExplanation = useCallback(async (question: Question, answer: UserAnswer | null | undefined) => {
    setIsLoading(true);
    setExplanation(null);
    setFeedbackState(null);
    setIsLocked(false);

    // US-22: 프리미엄 접근 제한 확인
    const examIdNum = Number(params.examId);
    const allowed = await canViewExplanation(examIdNum, question.id);
    if (!allowed) {
      setIsLocked(true);
      setIsLoading(false);
      return;
    }
    await markExplanationViewed(examIdNum, question.id);

    // 캐시 확인
    const cached = await getCachedExplanation(question.id);
    if (cached) {
      setExplanation(cached);
      const fb = await getFeedback(question.id);
      setFeedbackState(fb);
      setIsLoading(false);
      return;
    }

    // API 호출
    const result = await generateExplanation(question, answer?.selectedAnswer ?? null);
    const explanationData: CachedExplanation = {
      ...result,
      cachedAt: new Date().toISOString(),
    };

    await cacheExplanation(question.id, explanationData);
    setExplanation(explanationData);
    setIsLoading(false);
  }, [params.examId]);

  useEffect(() => {
    const q = filteredQuestions[currentIndex];
    if (!q) return;
    const a = userAnswers.find((a) => a.questionId === q.id) ?? null;
    loadExplanation(q, a);
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFeedback = async (type: 'good' | 'bad') => {
    if (!currentQuestion) return;
    const newFeedback = feedbackState === type ? null : type;
    setFeedbackState(newFeedback);
    if (newFeedback) {
      await saveFeedback(currentQuestion.id, newFeedback);
    }
  };

  const goNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowWrongDetails({});
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowWrongDetails({});
    }
  };

  if (dataLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!exam || filteredQuestions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>해설 데이터가 없습니다.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const isCorrect = currentAnswer?.isCorrect ?? false;

  return (
    <>
      <Stack.Screen
        options={{
          title: `제${exam.examNumber}회 해설`,
          headerBackTitle: '결과',
        }}
      />
      <View style={styles.container}>
        {/* 필터 토글 */}
        <View style={styles.filterRow}>
          <Text style={styles.questionCount}>
            {currentIndex + 1} / {filteredQuestions.length}
            {showWrongOnly ? ' (오답만)' : ''}
          </Text>
          <View style={[styles.resultBadge, isCorrect ? styles.correctBadge : styles.wrongBadge]}>
            <Text style={[styles.resultText, isCorrect ? styles.correctText : styles.wrongText]}>
              {isCorrect ? '정답' : '오답'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 문제 */}
          <View style={styles.questionSection}>
            <Text style={styles.questionLabel}>
              Q.{currentQuestion.questionNumber} · {currentQuestion.era} · {currentQuestion.category}
            </Text>
            <Text style={styles.questionContent}>{currentQuestion.content}</Text>
          </View>

          {/* 선지 + 정오답 표시 */}
          <View style={styles.choicesSection}>
            {currentQuestion.choices.map((choice, idx) => {
              const choiceNum = idx + 1;
              const isAnswer = choiceNum === currentQuestion.correctAnswer;
              const isUserChoice = choiceNum === currentAnswer?.selectedAnswer;
              const isWrongChoice = isUserChoice && !isCorrect;
              const wrongExpl = explanation?.wrongExplanations?.[choiceNum];

              return (
                <View key={choiceNum}>
                  <Pressable
                    style={[
                      styles.choiceItem,
                      isAnswer && styles.correctChoice,
                      isWrongChoice && styles.wrongChoice,
                    ]}
                    onPress={() => {
                      if (wrongExpl && !isAnswer) {
                        setShowWrongDetails((prev) => ({ ...prev, [choiceNum]: !prev[choiceNum] }));
                      }
                    }}
                  >
                    <View style={styles.choiceLeft}>
                      <Text style={[
                        styles.choiceNumber,
                        isAnswer && styles.correctChoiceText,
                        isWrongChoice && styles.wrongChoiceText,
                      ]}>
                        {isAnswer ? '✓' : isWrongChoice ? '✗' : `${choiceNum}`}
                      </Text>
                      <Text style={[
                        styles.choiceText,
                        isAnswer && styles.correctChoiceText,
                        isWrongChoice && styles.wrongChoiceText,
                      ]}>
                        {choice}
                      </Text>
                    </View>
                    {isUserChoice && (
                      <Text style={styles.myAnswerTag}>내 답</Text>
                    )}
                  </Pressable>
                  {/* 오답 선지 해설 (US-19) */}
                  {showWrongDetails[choiceNum] && wrongExpl && (
                    <View style={styles.wrongDetail}>
                      <Text style={styles.wrongDetailText}>{wrongExpl}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* 정답 해설 (US-18) + 프리미엄 잠금 (US-22) */}
          <View style={styles.explanationSection}>
            <Text style={styles.sectionTitle}>해설</Text>
            {isLocked ? (
              <View style={styles.lockedContainer}>
                <Text style={styles.lockedEmoji}>🔒</Text>
                <Text style={styles.lockedTitle}>프리미엄 해설</Text>
                <Text style={styles.lockedDesc}>
                  무료 해설 5문항을 모두 사용했습니다.{'\n'}
                  프리미엄으로 전체 해설을 확인하세요.
                </Text>
                <Pressable
                  style={styles.premiumButton}
                  onPress={() => router.push('/premium')}
                >
                  <Text style={styles.premiumButtonText}>프리미엄으로 전체 해설 보기 →</Text>
                </Pressable>
              </View>
            ) : isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>AI 해설을 생성하고 있습니다...</Text>
              </View>
            ) : (
              <Text style={styles.explanationText}>
                {explanation?.correctExplanation || '해설을 불러올 수 없습니다.'}
              </Text>
            )}
          </View>

          {/* 오답 선지 안내 */}
          {!isLoading && explanation && Object.keys(explanation.wrongExplanations || {}).length > 0 && (
            <View style={styles.tipSection}>
              <Text style={styles.tipText}>
                💡 각 선지를 탭하면 왜 틀렸는지 확인할 수 있습니다
              </Text>
            </View>
          )}

          {/* 피드백 (US-20) */}
          {!isLoading && explanation && (
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>이 해설이 도움이 되었나요?</Text>
              <View style={styles.feedbackButtons}>
                <Pressable
                  style={[styles.feedbackBtn, feedbackState === 'good' && styles.feedbackActive]}
                  onPress={() => handleFeedback('good')}
                >
                  <Text style={[styles.feedbackBtnText, feedbackState === 'good' && styles.feedbackActiveText]}>
                    👍 도움됨
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.feedbackBtn, feedbackState === 'bad' && styles.feedbackBadActive]}
                  onPress={() => handleFeedback('bad')}
                >
                  <Text style={[styles.feedbackBtnText, feedbackState === 'bad' && styles.feedbackActiveText]}>
                    👎 부족함
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 하단 네비게이션 (US-21) */}
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.navButton, currentIndex === 0 && styles.navDisabled]}
            onPress={goPrev}
            disabled={currentIndex === 0}
          >
            <Text style={[styles.navText, currentIndex === 0 && styles.navDisabledText]}>◀ 이전</Text>
          </Pressable>

          <Pressable
            style={styles.listButton}
            onPress={() => router.back()}
          >
            <Text style={styles.listButtonText}>결과로</Text>
          </Pressable>

          <Pressable
            style={[styles.navButton, currentIndex >= filteredQuestions.length - 1 && styles.navDisabled]}
            onPress={goNext}
            disabled={currentIndex >= filteredQuestions.length - 1}
          >
            <Text style={[styles.navText, currentIndex >= filteredQuestions.length - 1 && styles.navDisabledText]}>
              다음 ▶
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  questionCount: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  resultBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  correctBadge: { backgroundColor: '#E8F5E9' },
  wrongBadge: { backgroundColor: '#FFEBEE' },
  resultText: { fontSize: 13, fontWeight: '700' },
  correctText: { color: COLORS.success },
  wrongText: { color: COLORS.danger },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },

  questionSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
    fontWeight: '500',
  },
  questionContent: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },

  choicesSection: { marginBottom: 12, gap: 6 },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  correctChoice: {
    borderColor: COLORS.success,
    backgroundColor: '#F1F8F1',
  },
  wrongChoice: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFF5F5',
  },
  choiceLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  choiceNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginRight: 10,
  },
  choiceText: { fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 },
  correctChoiceText: { color: COLORS.success, fontWeight: '600' },
  wrongChoiceText: { color: COLORS.danger },
  myAnswerTag: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: '#EEF4FB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 8,
  },
  wrongDetail: {
    backgroundColor: '#FFF8F0',
    padding: 12,
    marginTop: -4,
    marginBottom: 2,
    borderRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.border,
  },
  wrongDetailText: { fontSize: 13, color: '#795548', lineHeight: 20 },

  explanationSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  explanationText: { fontSize: 14, color: COLORS.text, lineHeight: 24 },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: { fontSize: 13, color: COLORS.textSecondary },

  // US-22: 프리미엄 잠금
  lockedContainer: { alignItems: 'center', paddingVertical: 24 },
  lockedEmoji: { fontSize: 40, marginBottom: 12 },
  lockedTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  lockedDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  premiumButton: {
    backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12,
  },
  premiumButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  tipSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  tipText: { fontSize: 13, color: '#F57F17' },

  feedbackSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  feedbackLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  feedbackButtons: { flexDirection: 'row', gap: 12 },
  feedbackBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  feedbackActive: {
    borderColor: COLORS.success,
    backgroundColor: '#E8F5E9',
  },
  feedbackBadActive: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFEBEE',
  },
  feedbackBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  feedbackActiveText: { color: COLORS.text },

  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    minWidth: 80,
    alignItems: 'center',
  },
  navDisabled: { opacity: 0.3 },
  navText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  navDisabledText: { color: COLORS.textLight },
  listButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  listButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
