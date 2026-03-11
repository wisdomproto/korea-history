import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { COLORS, ERAS, RADIUS, SHADOWS } from '@/lib/constants';
import { Era, Question } from '@/lib/types';
import { fetchAllQuestions } from '@/lib/examData';
import QuestionCard from '@/components/exam/QuestionCard';
import ChoiceList from '@/components/exam/ChoiceList';

export default function UnitStudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ era?: string }>();

  const [selectedEra, setSelectedEra] = useState<Era | null>(
    (params.era as Era) || null,
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [eraCounts, setEraCounts] = useState<Record<string, number>>({});
  const [eraCountsLoaded, setEraCountsLoaded] = useState(false);

  // Load era counts on mount
  useEffect(() => {
    fetchAllQuestions().then((allQ) => {
      const counts: Record<string, number> = {};
      allQ.forEach((q) => { counts[q.era] = (counts[q.era] || 0) + 1; });
      setEraCounts(counts);
      setEraCountsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!selectedEra) return;
    fetchAllQuestions().then((all) => {
      const filtered = all.filter((q) => q.era === selectedEra);
      // Shuffle questions for variety
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setCorrectCount(0);
      setCompleted(false);
    });
  }, [selectedEra]);

  const current = questions[currentIndex];

  const handleSelect = useCallback(
    (choice: number) => {
      if (showResult) return;
      setSelectedAnswer(choice);
      setShowResult(true);
      if (current && choice === current.correctAnswer) {
        setCorrectCount((c) => c + 1);
      }
    },
    [showResult, current],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  }, [currentIndex, questions.length]);

  // ─── 시대 선택 화면 ───
  if (!selectedEra) {
    if (!eraCountsLoaded) {
      return (
        <>
          <Stack.Screen options={{ title: '단원별 학습' }} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </>
      );
    }

    return (
      <>
        <Stack.Screen options={{ title: '단원별 학습' }} />
        <ScrollView style={styles.container} contentContainerStyle={styles.eraListContent}>
          <Text style={styles.eraHeader}>학습할 시대를 선택하세요</Text>
          <Text style={styles.eraSubheader}>
            각 시대의 기출문제를 즉시 피드백 모드로 풀어볼 수 있습니다
          </Text>
          {ERAS.map((era) => {
            const count = eraCounts[era.key] || 0;
            return (
              <Pressable
                key={era.key}
                style={styles.eraCard}
                onPress={() => count > 0 && setSelectedEra(era.key)}
                disabled={count === 0}
              >
                <View style={[styles.eraColorDot, { backgroundColor: era.color }]} />
                <View style={styles.eraTextWrap}>
                  <Text style={[styles.eraLabel, count === 0 && styles.disabledText]}>
                    {era.label}
                  </Text>
                  <Text style={styles.eraCount}>
                    {count > 0 ? `${count}문항` : '문제 없음'}
                  </Text>
                </View>
                {count > 0 && <Text style={styles.arrow}>›</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      </>
    );
  }

  // ─── 문제 없음 ───
  if (questions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: '단원별 학습' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>이 시대의 문제가 없습니다</Text>
          <Pressable style={styles.backBtn} onPress={() => setSelectedEra(null)}>
            <Text style={styles.backBtnText}>시대 선택으로 돌아가기</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // ─── 완료 화면 ───
  if (completed) {
    const eraInfo = ERAS.find((e) => e.key === selectedEra);
    const rate = Math.round((correctCount / questions.length) * 100);
    return (
      <>
        <Stack.Screen options={{ title: '학습 완료' }} />
        <View style={styles.resultContainer}>
          <Text style={styles.resultIcon}>{rate >= 80 ? '🎉' : rate >= 60 ? '👍' : '💪'}</Text>
          <Text style={styles.resultTitle}>{eraInfo?.label} 학습 완료!</Text>
          <Text style={styles.resultScore}>
            {questions.length}문항 중 {correctCount}문항 정답 ({rate}%)
          </Text>
          <Text style={styles.resultDesc}>
            {rate >= 80
              ? '훌륭합니다! 이 시대를 잘 이해하고 있어요.'
              : rate >= 60
                ? '좋은 성적입니다. 조금만 더 복습하면 완벽해질 거예요!'
                : '이 시대에 대해 더 학습이 필요합니다. 다시 도전해보세요!'}
          </Text>
          <View style={styles.resultActions}>
            <Pressable style={styles.actionBtn} onPress={() => setSelectedEra(null)}>
              <Text style={styles.actionBtnText}>다른 시대</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => {
                // Re-shuffle and restart
                fetchAllQuestions().then((all) => {
                  const filtered = all.filter((q) => q.era === selectedEra);
                  setQuestions(filtered.sort(() => Math.random() - 0.5));
                  setCurrentIndex(0);
                  setSelectedAnswer(null);
                  setShowResult(false);
                  setCorrectCount(0);
                  setCompleted(false);
                });
              }}
            >
              <Text style={styles.primaryBtnText}>다시 학습</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  // ─── 문제 풀이 화면 ───
  const eraInfo = ERAS.find((e) => e.key === selectedEra);

  return (
    <>
      <Stack.Screen options={{ title: `${eraInfo?.label || '단원별'} 학습` }} />
      <View style={styles.studyContainer}>
       <View style={styles.contentWrap}>
        {/* Progress */}
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {questions.length}
          </Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                  backgroundColor: eraInfo?.color || COLORS.primary,
                },
              ]}
            />
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <QuestionCard
            question={current}
            questionIndex={currentIndex}
            totalQuestions={questions.length}
          />

          <ChoiceList
            choices={current.choices}
            choiceImages={current.choiceImages}
            selectedAnswer={selectedAnswer}
            onSelect={handleSelect}
            correctAnswer={current.correctAnswer}
            showResult={showResult}
          />

          {/* Feedback */}
          {showResult && (
            <View
              style={[
                styles.feedbackBox,
                selectedAnswer === current.correctAnswer
                  ? styles.correctFeedback
                  : styles.wrongFeedback,
              ]}
            >
              <Text style={styles.feedbackText}>
                {selectedAnswer === current.correctAnswer
                  ? '✅ 정답!'
                  : `❌ 오답! 정답은 ${current.correctAnswer}번입니다.`}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottomBar}>
          {showResult ? (
            <Pressable style={[styles.nextBtn, styles.primaryBtn]} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>
                {currentIndex < questions.length - 1 ? '다음 문항 ▶' : '결과 보기'}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.hintText}>선지를 선택하면 즉시 정답이 확인됩니다</Text>
          )}
        </View>
       </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  eraListContent: { padding: 16, paddingBottom: 40 },
  eraHeader: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  eraSubheader: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 20 },
  eraCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: '#E8E8F4',
    ...SHADOWS.sm,
  },
  eraColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 14 },
  eraTextWrap: { flex: 1 },
  eraLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  eraCount: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  disabledText: { color: COLORS.disabled },
  arrow: { fontSize: 22, color: COLORS.textLight },

  emptyContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  studyContainer: { flex: 1, backgroundColor: COLORS.background },
  contentWrap: { flex: 1, maxWidth: 640, width: '100%', alignSelf: 'center' as const },
  progressBar: { padding: 16, paddingBottom: 8 },
  progressText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '500' },
  progressBg: { height: 6, backgroundColor: '#F1F0FF', borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },

  feedbackBox: { marginTop: 16, padding: 14, borderRadius: 10 },
  correctFeedback: { backgroundColor: '#E8F5E9' },
  wrongFeedback: { backgroundColor: '#FFEBEE' },
  feedbackText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },

  bottomBar: {
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
  },
  nextBtn: { width: '100%', paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: 'center' },
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
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
});
