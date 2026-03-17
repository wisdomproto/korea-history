import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS, ERAS, CATEGORIES, getGrade, RADIUS, SHADOWS } from '@/lib/constants';
import { useExamWithQuestions } from '@/hooks/useExamData';
import { UserAnswer, Era, Category } from '@/lib/types';
import { addWrongAnswers, saveExamRecord } from '@/lib/storage';

function StatBar({ label, correct, total, color }: { label: string; correct: number; total: number; color: string }) {
  const rate = total > 0 ? correct / total : 0;
  const percentage = Math.round(rate * 100);

  return (
    <View style={statStyles.row}>
      <Text style={statStyles.label}>{label}</Text>
      <View style={statStyles.barBg}>
        <View style={[statStyles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={statStyles.value}>{correct}/{total}</Text>
      <Text style={[statStyles.percent, percentage >= 70 ? statStyles.good : percentage >= 50 ? statStyles.mid : statStyles.bad]}>
        {percentage}%
      </Text>
    </View>
  );
}

export default function ExamResultScreen() {
  const params = useLocalSearchParams<{
    examId: string;
    score: string;
    correct: string;
    total: string;
    earnedPoints: string;
    totalPoints: string;
    answers: string;
  }>();
  const router = useRouter();
  const { data: { exam, questions }, isLoading: dataLoading } = useExamWithQuestions(Number(params.examId));

  const scoreNum = Number(params.score);
  const correctNum = Number(params.correct);
  const totalNum = Number(params.total);
  const earnedPoints = Number(params.earnedPoints || 0);
  const totalPoints = Number(params.totalPoints || 100);
  const grade = exam ? getGrade(scoreNum, exam.examType) : '—';
  const isPassed = grade !== '불합격';

  // 답안 파싱
  let userAnswers: UserAnswer[] = [];
  try {
    const parsed = JSON.parse(params.answers || '[]');
    userAnswers = Array.isArray(parsed) ? parsed : [];
  } catch {}

  // 오답 자동 수집 + 시험 기록 저장 (US-12)
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current || !exam || userAnswers.length === 0) return;
    savedRef.current = true;

    const questionsData = questions.map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      correctAnswer: q.correctAnswer,
      era: q.era,
      category: q.category,
    }));
    addWrongAnswers(exam.id, userAnswers, questionsData);
    saveExamRecord({
      examId: exam.id,
      examNumber: exam.examNumber,
      score: scoreNum,
      grade,
      correctCount: correctNum,
      totalQuestions: totalNum,
      completedAt: new Date().toISOString(),
    });
  }, [exam, userAnswers.length, questions]);

  // 시대별 통계
  const eraStats: Record<string, { correct: number; total: number }> = {};
  ERAS.forEach((e) => { eraStats[e.key] = { correct: 0, total: 0 }; });

  // 유형별 통계
  const categoryStats: Record<string, { correct: number; total: number }> = {};
  CATEGORIES.forEach((c) => { categoryStats[c.key] = { correct: 0, total: 0 }; });

  // 통계 계산
  questions.forEach((q) => {
    const answer = userAnswers.find((a) => a.questionId === q.id);
    const isCorrect = answer?.isCorrect ?? false;

    if (eraStats[q.era]) {
      eraStats[q.era].total++;
      if (isCorrect) eraStats[q.era].correct++;
    }
    if (categoryStats[q.category]) {
      categoryStats[q.category].total++;
      if (isCorrect) categoryStats[q.category].correct++;
    }
  });

  // 오답 문제 목록 (미응답 제외)
  const wrongAnswers = userAnswers
    .filter((a) => !a.isCorrect && a.selectedAnswer != null)
    .map((a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return { ...a, question: q };
    })
    .filter((a) => a.question);

  if (dataLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '채점 결과',
          headerBackVisible: false,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* 점수 카드 */}
        <View style={styles.scoreCard}>
          <Text style={styles.examTitle}>
            제{exam?.examNumber ?? '—'}회 모의고사
          </Text>
          <Text style={styles.scoreValue}>{scoreNum}</Text>
          <Text style={styles.scoreLabel}>/ 100점</Text>
          <View style={[styles.gradeBadge, isPassed ? styles.passedBadge : styles.failedBadge]}>
            <Text style={[styles.gradeText, isPassed ? styles.passedText : styles.failedText]}>
              {grade}
            </Text>
          </View>
          <Text style={styles.correctCount}>
            {totalNum}문항 중 {correctNum}문항 정답 ({earnedPoints}/{totalPoints}점)
          </Text>
        </View>

        {/* 시대별 분석 */}
        <View style={styles.analysisCard}>
          <Text style={styles.sectionTitle}>시대별 정답률</Text>
          {ERAS.map((era) => {
            const stat = eraStats[era.key];
            if (stat.total === 0) return null;
            return (
              <StatBar
                key={era.key}
                label={era.label}
                correct={stat.correct}
                total={stat.total}
                color={era.color}
              />
            );
          })}
        </View>

        {/* 유형별 분석 */}
        <View style={styles.analysisCard}>
          <Text style={styles.sectionTitle}>유형별 정답률</Text>
          {CATEGORIES.map((cat) => {
            const stat = categoryStats[cat.key];
            if (stat.total === 0) return null;
            return (
              <StatBar
                key={cat.key}
                label={cat.label}
                correct={stat.correct}
                total={stat.total}
                color={COLORS.primary}
              />
            );
          })}
        </View>

        {/* 오답 요약 */}
        {wrongAnswers.length > 0 && (
          <View style={styles.analysisCard}>
            <Text style={styles.sectionTitle}>
              오답 문항 ({wrongAnswers.length}문항)
            </Text>
            {wrongAnswers.map((wa) => (
              <View key={wa.questionId} style={styles.wrongItem}>
                <View style={styles.wrongHeader}>
                  <Text style={styles.wrongNumber}>Q.{wa.question!.questionNumber}</Text>
                  <Text style={styles.wrongEra}>{wa.question!.era}</Text>
                </View>
                <Text style={styles.wrongContent} numberOfLines={2}>
                  {wa.question!.content.replace(/\n/g, ' ')}
                </Text>
                <View style={styles.wrongAnswerRow}>
                  <Text style={styles.wrongSelected}>
                    내 답: {wa.selectedAnswer ? `${wa.selectedAnswer}번` : '미응답'}
                  </Text>
                  <Text style={styles.wrongCorrect}>
                    정답: {wa.question!.correctAnswer}번
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 해설 보기 버튼 */}
        <View style={styles.explanationActions}>
          <Pressable
            style={styles.explanationBtn}
            onPress={() => router.push({
              pathname: '/exam/explanation/[examId]',
              params: { examId: params.examId, answers: params.answers, filter: 'all' },
            })}
          >
            <Text style={styles.explanationBtnText}>📖 전체 해설 보기</Text>
          </Pressable>
          {wrongAnswers.length > 0 && (
            <Pressable
              style={[styles.explanationBtn, styles.wrongExplBtn]}
              onPress={() => router.push({
                pathname: '/exam/explanation/[examId]',
                params: { examId: params.examId, answers: params.answers, filter: 'wrong' },
              })}
            >
              <Text style={[styles.explanationBtnText, styles.wrongExplBtnText]}>
                ❌ 오답 해설만 보기 ({wrongAnswers.length}문항)
              </Text>
            </Pressable>
          )}
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.replace('/exam/select')}
          >
            <Text style={styles.actionButtonText}>다른 회차 풀기</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => router.replace('/(tabs)/study')}
          >
            <Text style={[styles.actionButtonText, styles.primaryActionText]}>학습 탭으로</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const statStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    width: 72,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  barBg: {
    flex: 1,
    height: 12,
    backgroundColor: '#F1F0FF',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  value: {
    width: 32,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  percent: {
    width: 38,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  good: { color: COLORS.success },
  mid: { color: COLORS.warning },
  bad: { color: COLORS.danger },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  scoreCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.lg,
    marginBottom: 16,
  },
  examTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 60,
    fontWeight: '900',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 14,
  },
  gradeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: 10,
  },
  passedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  failedBadge: {
    backgroundColor: 'rgba(239,68,68,0.3)',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  passedText: {
    color: '#fff',
  },
  failedText: {
    color: '#FCA5A5',
  },
  correctCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  analysisCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  wrongItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wrongHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wrongNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
    marginRight: 8,
  },
  wrongEra: {
    fontSize: 11,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  wrongContent: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  wrongAnswerRow: {
    flexDirection: 'row',
    gap: 16,
  },
  wrongSelected: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  wrongCorrect: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  explanationActions: {
    gap: 10,
    marginBottom: 16,
  },
  explanationBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  wrongExplBtn: {
    backgroundColor: '#FFF3E0',
  },
  explanationBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  wrongExplBtnText: {
    color: '#E65100',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8F4',
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  primaryActionText: {
    color: '#fff',
  },
});
