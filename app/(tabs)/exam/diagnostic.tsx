import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { COLORS, ERAS } from '@/lib/constants';
import { useAllQuestions } from '@/hooks/useExamData';
import { useExam } from '@/hooks/useExam';
import { useTimer } from '@/hooks/useTimer';
import { Question, Era } from '@/lib/types';
import QuestionCard from '@/components/exam/QuestionCard';
import ChoiceList from '@/components/exam/ChoiceList';
import Timer from '@/components/exam/Timer';

/** 시대별 균등 배분으로 20문항 선택 */
function selectDiagnosticQuestions(allQuestions: Question[]): Question[] {
  const eras = ERAS.map((e) => e.key);
  const questionsPerEra = Math.ceil(20 / eras.length); // 2~3문항/시대
  const selected: Question[] = [];

  for (const era of eras) {
    const eraQuestions = allQuestions.filter((q) => q.era === era);
    // 랜덤 셔플 후 필요한 수만큼 선택
    const shuffled = [...eraQuestions].sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, questionsPerEra));
  }

  // 20문항 초과 시 자르기, 부족 시 랜덤 추가
  if (selected.length > 20) {
    return selected.slice(0, 20);
  }
  if (selected.length < 20) {
    const remaining = allQuestions.filter((q) => !selected.includes(q));
    const extra = [...remaining].sort(() => Math.random() - 0.5).slice(0, 20 - selected.length);
    selected.push(...extra);
  }

  return selected.sort(() => Math.random() - 0.5); // 최종 셔플
}

interface EraResult {
  era: string;
  label: string;
  color: string;
  total: number;
  correct: number;
  rate: number;
}

export default function DiagnosticScreen() {
  const router = useRouter();
  const hasSubmittedRef = useRef(false);
  const [showResult, setShowResult] = useState(false);
  const [eraResults, setEraResults] = useState<EraResult[]>([]);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const { data: allQuestions, isLoading: allLoading } = useAllQuestions();
  const questions = useMemo(
    () => (allQuestions.length > 0 ? selectDiagnosticQuestions(allQuestions) : []),
    [allQuestions],
  );

  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    currentAnswer,
    answers,
    answeredCount,
    selectAnswer,
    goNext,
    goPrev,
    goToQuestion,
    submitExam,
  } = useExam(questions);

  const doSubmit = useCallback(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const results = submitExam();
    const correct = results.filter((r) => r.isCorrect).length;
    setTotalCorrect(correct);

    // 시대별 정답률 계산
    const eraMap = new Map<Era, { total: number; correct: number }>();
    results.forEach((r) => {
      const q = questions.find((q) => q.id === r.questionId);
      if (!q) return;
      const entry = eraMap.get(q.era) || { total: 0, correct: 0 };
      entry.total++;
      if (r.isCorrect) entry.correct++;
      eraMap.set(q.era, entry);
    });

    const eraResultList: EraResult[] = ERAS.map((era) => {
      const entry = eraMap.get(era.key) || { total: 0, correct: 0 };
      return {
        era: era.key,
        label: era.label,
        color: era.color,
        total: entry.total,
        correct: entry.correct,
        rate: entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0,
      };
    }).filter((e) => e.total > 0);

    setEraResults(eraResultList);
    setShowResult(true);
  }, [submitExam, questions]);

  const handleTimeUp = useCallback(() => {
    Alert.alert(
      '시간 종료',
      '진단 시간이 종료되었습니다.\n결과를 확인합니다.',
      [{ text: '확인', onPress: doSubmit }],
    );
  }, [doSubmit]);

  const { formattedTime, isWarning, progress } = useTimer({
    totalMinutes: 5,
    warningMinutes: 1,
    onTimeUp: handleTimeUp,
  });

  // 로딩 중
  if (allLoading || questions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: '진단 테스트' }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>문제를 불러오는 중...</Text>
        </View>
      </>
    );
  }

  // 결과 화면
  if (showResult) {
    const weakEras = [...eraResults].sort((a, b) => a.rate - b.rate).slice(0, 3);
    return (
      <>
        <Stack.Screen options={{ title: '진단 결과', headerBackVisible: false }} />
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.resultScroll}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>📊</Text>
              <Text style={styles.resultTitle}>진단 완료!</Text>
              <Text style={styles.resultScore}>
                {totalCorrect} / {totalQuestions} 정답
              </Text>
              <Text style={styles.resultRate}>
                정답률 {Math.round((totalCorrect / totalQuestions) * 100)}%
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.sectionTitle}>시대별 정답률</Text>
              {eraResults.map((era) => (
                <View key={era.era} style={styles.eraRow}>
                  <View style={styles.eraLabelRow}>
                    <View style={[styles.eraDot, { backgroundColor: era.color }]} />
                    <Text style={styles.eraLabel}>{era.label}</Text>
                    <Text style={styles.eraScore}>
                      {era.correct}/{era.total}
                    </Text>
                  </View>
                  <View style={styles.eraBarBg}>
                    <View
                      style={[
                        styles.eraBar,
                        {
                          width: `${era.rate}%`,
                          backgroundColor: era.rate >= 70 ? COLORS.success : era.rate >= 40 ? COLORS.secondary : COLORS.danger,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.eraRate,
                    { color: era.rate >= 70 ? COLORS.success : era.rate >= 40 ? COLORS.secondary : COLORS.danger },
                  ]}>
                    {era.rate}%
                  </Text>
                </View>
              ))}
            </View>

            {weakEras.length > 0 && weakEras[0].rate < 70 && (
              <View style={styles.weakCard}>
                <Text style={styles.sectionTitle}>💡 집중 학습 추천</Text>
                <Text style={styles.weakDesc}>
                  아래 시대를 우선적으로 학습하면 효과적입니다:
                </Text>
                {weakEras.filter((e) => e.rate < 70).map((era) => (
                  <View key={era.era} style={styles.weakItem}>
                    <View style={[styles.weakDot, { backgroundColor: era.color }]} />
                    <Text style={styles.weakText}>
                      {era.label} ({era.rate}%)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.resultFooter}>
            <Pressable
              style={styles.startButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.startButtonText}>학습 시작하기 🚀</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // 시험 화면
  const handleSubmit = () => {
    const unanswered = totalQuestions - answeredCount;
    const message = unanswered > 0
      ? `아직 ${unanswered}문항을 풀지 않았습니다.\n제출하시겠습니까?`
      : '진단 테스트를 제출하시겠습니까?';
    Alert.alert('제출', message, [
      { text: '취소', style: 'cancel' },
      { text: '제출', onPress: doSubmit },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '진단 테스트',
          headerBackTitle: '취소',
          headerRight: () => (
            <Pressable onPress={handleSubmit}>
              <Text style={styles.submitHeaderBtn}>제출</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <Timer formattedTime={formattedTime} isWarning={isWarning} progress={progress} />

        <View style={styles.infoBar}>
          <Text style={styles.infoText}>
            ⏱ 5분 진단 · 시대별 균등 출제 · {answeredCount}/{totalQuestions} 답변
          </Text>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <QuestionCard
            question={currentQuestion}
            questionIndex={currentIndex}
            totalQuestions={totalQuestions}
          />
          <ChoiceList
            choices={currentQuestion.choices}
            choiceImages={currentQuestion.choiceImages}
            selectedAnswer={currentAnswer}
            onSelect={selectAnswer}
          />
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={goPrev}
            disabled={currentIndex === 0}
          >
            <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
              ◀ 이전
            </Text>
          </Pressable>

          <Text style={styles.progressText}>{currentIndex + 1} / {totalQuestions}</Text>

          {currentIndex < totalQuestions - 1 ? (
            <Pressable style={styles.navButton} onPress={goNext}>
              <Text style={styles.navButtonText}>다음 ▶</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>제출하기</Text>
            </Pressable>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  submitHeaderBtn: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  infoBar: {
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoText: { fontSize: 12, color: '#F57F17', fontWeight: '500', textAlign: 'center' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
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
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.background, minWidth: 80, alignItems: 'center',
  },
  navButtonDisabled: { opacity: 0.3 },
  navButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  navButtonTextDisabled: { color: COLORS.textLight },
  progressText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  submitBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.primary, minWidth: 80, alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // --- 결과 ---
  resultScroll: { padding: 20, paddingBottom: 100 },
  resultHeader: { alignItems: 'center', paddingVertical: 24 },
  resultEmoji: { fontSize: 56, marginBottom: 12 },
  resultTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 8 },
  resultScore: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  resultRate: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  eraRow: { marginBottom: 14 },
  eraLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eraDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  eraLabel: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  eraScore: { fontSize: 12, color: COLORS.textSecondary },
  eraBarBg: {
    height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 2,
  },
  eraBar: { height: '100%', borderRadius: 4 },
  eraRate: { fontSize: 12, fontWeight: '700', textAlign: 'right' },

  weakCard: {
    backgroundColor: '#FFF8E1', borderRadius: 16, padding: 20,
  },
  weakDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 20 },
  weakItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  weakDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  weakText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },

  resultFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32, backgroundColor: COLORS.background,
  },
  startButton: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
