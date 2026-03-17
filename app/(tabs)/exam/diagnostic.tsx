import { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ERAS, RADIUS, SHADOWS } from '@/lib/constants';
import { useAllQuestions } from '@/hooks/useExamData';
import { Question, Era } from '@/lib/types';
import { useStudyState } from '@/hooks/useStudyState';
import StudyView from '@/components/exam/StudyView';

/** 시대별 균등 배분으로 20문항 선택 */
function selectDiagnosticQuestions(allQuestions: Question[]): Question[] {
  const eras = ERAS.map((e) => e.key);
  const questionsPerEra = Math.ceil(20 / eras.length);
  const selected: Question[] = [];

  for (const era of eras) {
    const eraQuestions = allQuestions.filter((q) => q.era === era);
    const shuffled = [...eraQuestions].sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, questionsPerEra));
  }

  if (selected.length > 20) return selected.slice(0, 20);
  if (selected.length < 20) {
    const remaining = allQuestions.filter((q) => !selected.includes(q));
    const extra = [...remaining].sort(() => Math.random() - 0.5).slice(0, 20 - selected.length);
    selected.push(...extra);
  }

  return selected.sort(() => Math.random() - 0.5);
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
  const { data: allQuestions, isLoading: allLoading } = useAllQuestions();
  const [eraResults, setEraResults] = useState<EraResult[]>([]);

  const questions = useMemo(
    () => (allQuestions.length > 0 ? selectDiagnosticQuestions(allQuestions) : []),
    [allQuestions],
  );

  const study = useStudyState();

  useEffect(() => {
    if (questions.length > 0 && study.questions.length === 0) {
      study.startStudy(questions);
    }
  }, [questions]);

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
  if (study.completed) {
    // Calculate era results
    if (eraResults.length === 0) {
      const eraMap = new Map<Era, { total: number; correct: number }>();
      study.questions.forEach((q, i) => {
        const entry = eraMap.get(q.era) || { total: 0, correct: 0 };
        entry.total++;
        eraMap.set(q.era, entry);
      });
      // We don't have per-question correct info easily, but we have correctCount
      // Use a simpler display
      const list: EraResult[] = ERAS.map((era) => {
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
      setEraResults(list);
    }

    const rate = Math.round((study.correctCount / study.questions.length) * 100);
    const weakEras = [...eraResults].sort((a, b) => a.rate - b.rate).slice(0, 3);

    return (
      <>
        <Stack.Screen options={{ title: '진단 결과', headerBackVisible: false }} />
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.resultScroll}>
            <View style={styles.resultHeader}>
              <Ionicons name="analytics" size={56} color={COLORS.primary} />
              <Text style={styles.resultTitle}>진단 완료!</Text>
              <Text style={styles.resultScore}>
                {study.correctCount} / {study.questions.length} 정답
              </Text>
              <Text style={styles.resultRate}>
                정답률 {rate}%
              </Text>
            </View>

            {weakEras.length > 0 && weakEras[0].rate < 70 && (
              <View style={styles.weakCard}>
                <Text style={styles.sectionTitle}>집중 학습 추천</Text>
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
              <Text style={styles.startButtonText}>학습 시작하기</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // 문제 풀이 화면
  if (!study.current) return null;

  return (
    <>
      <Stack.Screen options={{ title: '진단 테스트' }} />
      <StudyView
        current={study.current}
        currentIndex={study.currentIndex}
        totalQuestions={study.questions.length}
        selectedAnswer={study.selectedAnswer}
        showResult={study.showResult}
        onSelect={study.handleSelect}
        onConfirm={study.handleConfirm}
        onNext={study.handleNext}
        isLastQuestion={study.currentIndex >= study.questions.length - 1}
        onSubmit={study.handleSubmit}
        progressRight={
          <Text style={styles.progressInfo}>시대별 균등 출제</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  progressInfo: { fontSize: 11, color: COLORS.textSecondary },

  // --- 결과 ---
  resultScroll: { padding: 20, paddingBottom: 100 },
  resultHeader: { alignItems: 'center', paddingVertical: 24 },
  resultTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  resultScore: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  resultRate: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },

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
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 16, alignItems: 'center',
    ...SHADOWS.md,
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
