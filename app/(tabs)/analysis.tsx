import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '@/components/Container';
import { COLORS, ERAS, CATEGORIES, SHADOWS, RADIUS } from '@/lib/constants';
import { Era, Category } from '@/lib/types';
import { getWrongNotes, getExamRecords, WrongNote, ExamRecord } from '@/lib/storage';

export default function AnalysisScreen() {
  const router = useRouter();
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([]);
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    const [wn, rec] = await Promise.all([getWrongNotes(), getExamRecords()]);
    setWrongNotes(wn);
    setRecords(rec);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!loaded) return null;

  const hasData = wrongNotes.length > 0 || records.length > 0;

  if (!hasData) {
    return (
      <Container style={{ justifyContent: 'center' }}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="bar-chart-outline" size={40} color={COLORS.border} />
          </View>
          <Text style={styles.emptyTitle}>아직 분석 데이터가 없어요</Text>
          <Text style={styles.emptyDesc}>모의고사를 풀면 시대별·유형별 취약점 분석이 표시됩니다.</Text>
        </View>
      </Container>
    );
  }

  const eraWeakness = ERAS.map((era) => ({
    ...era,
    wrongCount: wrongNotes.filter((n) => n.era === era.key && !n.isResolved).length,
  }))
    .filter((e) => e.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount);

  const categoryWeakness = CATEGORIES.map((cat) => ({
    ...cat,
    wrongCount: wrongNotes.filter((n) => n.category === cat.key && !n.isResolved).length,
  }))
    .filter((c) => c.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount);

  const repeatedWrongs = wrongNotes
    .filter((n) => n.wrongCount >= 2 && !n.isResolved)
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 5);

  const unresolvedCount = wrongNotes.filter((n) => !n.isResolved).length;
  const topWeakEra = eraWeakness[0];
  const topWeakCategory = categoryWeakness[0];

  const totalExams = records.length;
  const avgScore =
    totalExams > 0
      ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalExams)
      : 0;

  return (
    <Container scroll>
      {/* 요약 카드 */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalExams}</Text>
          <Text style={styles.summaryLabel}>응시 횟수</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{avgScore}</Text>
          <Text style={styles.summaryLabel}>평균 점수</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, unresolvedCount > 0 && { color: COLORS.secondary }]}>
            {unresolvedCount}
          </Text>
          <Text style={styles.summaryLabel}>미해결 오답</Text>
        </View>
      </View>

      {/* 맞춤 복습 추천 */}
      {(topWeakEra || unresolvedCount > 0) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb" size={18} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>맞춤 복습 추천</Text>
          </View>
          {unresolvedCount > 0 && (
            <Pressable
              style={styles.recommendCard}
              onPress={() => router.push('/exam/review')}
            >
              <View style={[styles.recommendIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="refresh" size={18} color="#F59E0B" />
              </View>
              <View style={styles.recommendText}>
                <Text style={styles.recommendTitle}>오답 복습하기</Text>
                <Text style={styles.recommendDesc}>미해결 오답 {unresolvedCount}문항을 다시 풀어보세요</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </Pressable>
          )}
          {topWeakEra && (
            <Pressable
              style={styles.recommendCard}
              onPress={() =>
                router.push({ pathname: '/exam/unit', params: { era: topWeakEra.key } })
              }
            >
              <View style={[styles.recommendIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="book" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.recommendText}>
                <Text style={styles.recommendTitle}>{topWeakEra.label} 집중 학습</Text>
                <Text style={styles.recommendDesc}>
                  가장 취약한 시대입니다 (오답 {topWeakEra.wrongCount}문항)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </Pressable>
          )}
          {topWeakCategory && (
            <Pressable style={styles.recommendCard}>
              <View style={[styles.recommendIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="flag" size={18} color="#10B981" />
              </View>
              <View style={styles.recommendText}>
                <Text style={styles.recommendTitle}>{topWeakCategory.label} 유형 강화</Text>
                <Text style={styles.recommendDesc}>
                  오답 {topWeakCategory.wrongCount}문항 — 해당 유형 집중 필요
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* 반복 오답 알림 */}
      {repeatedWrongs.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning" size={18} color={COLORS.danger} />
            <Text style={styles.sectionTitle}>반복 오답 주의</Text>
          </View>
          <Text style={styles.alertDesc}>같은 문제를 2회 이상 틀렸습니다</Text>
          {repeatedWrongs.map((wn) => (
            <View key={`${wn.examId}-${wn.questionId}`} style={styles.alertItem}>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{wn.wrongCount}회</Text>
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertQuestion}>Q.{wn.questionNumber}</Text>
                <Text style={styles.alertMeta}>
                  {wn.era} · {wn.category}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 시대별 오답 분포 */}
      {eraWeakness.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>시대별 오답 분포</Text>
          </View>
          {eraWeakness.map((era) => {
            const maxWrong = eraWeakness[0].wrongCount;
            const pct = maxWrong > 0 ? Math.round((era.wrongCount / maxWrong) * 100) : 0;
            return (
              <Pressable
                key={era.key}
                style={styles.barRow}
                onPress={() =>
                  router.push({ pathname: '/exam/unit', params: { era: era.key } })
                }
              >
                <Text style={styles.barLabel}>{era.label}</Text>
                <View style={styles.barBg}>
                  <View
                    style={[styles.barFill, { width: `${pct}%`, backgroundColor: era.color }]}
                  />
                </View>
                <Text style={[styles.barValue, { color: era.color }]}>{era.wrongCount}문항</Text>
              </Pressable>
            );
          })}
          <Text style={styles.tapHint}>탭하여 해당 시대 학습하기</Text>
        </View>
      )}

      {/* 유형별 오답 분포 */}
      {categoryWeakness.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="grid" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>유형별 오답 분포</Text>
          </View>
          {categoryWeakness.map((cat) => {
            const maxWrong = categoryWeakness[0].wrongCount;
            const pct = maxWrong > 0 ? Math.round((cat.wrongCount / maxWrong) * 100) : 0;
            return (
              <View key={cat.key} style={styles.barRow}>
                <Text style={styles.barLabel}>{cat.label}</Text>
                <View style={styles.barBg}>
                  <View
                    style={[styles.barFill, { width: `${pct}%`, backgroundColor: COLORS.primary }]}
                  />
                </View>
                <Text style={[styles.barValue, { color: COLORS.primary }]}>
                  {cat.wrongCount}문항
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 시험 기록 */}
      {records.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>시험 기록</Text>
          </View>
          {records
            .slice(-5)
            .reverse()
            .map((rec, i) => (
              <View key={i} style={styles.recordRow}>
                <Text style={styles.recordExam}>제{rec.examNumber}회</Text>
                <Text style={styles.recordScore}>{rec.score}점</Text>
                <View
                  style={[
                    styles.recordGradeBadge,
                    rec.grade !== '불합격' ? styles.passBadge : styles.failBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.recordGrade,
                      rec.grade !== '불합격' ? styles.passText : styles.failText,
                    ]}
                  >
                    {rec.grade}
                  </Text>
                </View>
                <Text style={styles.recordDate}>
                  {new Date(rec.completedAt).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            ))}
        </View>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  // --- Empty ---
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 40,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // --- Summary ---
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary },

  // --- Card ---
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },

  // --- Recommend ---
  recommendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recommendIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendText: { flex: 1 },
  recommendTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  recommendDesc: { fontSize: 12, color: COLORS.textSecondary },

  // --- Alert ---
  alertDesc: { fontSize: 13, color: COLORS.danger, marginBottom: 12, marginTop: -8 },
  alertItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  alertBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 12,
  },
  alertBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  alertContent: { flex: 1 },
  alertQuestion: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  alertMeta: { fontSize: 12, color: COLORS.textSecondary },

  // --- Bar chart ---
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: { width: 72, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  barBg: {
    flex: 1,
    height: 16,
    backgroundColor: '#F1F0FF',
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: { height: '100%', borderRadius: 8 },
  barValue: { width: 50, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  tapHint: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 6,
  },

  // --- Records ---
  recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  recordExam: { fontSize: 14, fontWeight: '600', color: COLORS.text, width: 60 },
  recordScore: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 40 },
  recordGradeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  passBadge: { backgroundColor: '#ECFDF5' },
  failBadge: { backgroundColor: '#FEE2E2' },
  recordGrade: { fontSize: 12, fontWeight: '700' },
  passText: { color: COLORS.success },
  failText: { color: COLORS.danger },
  recordDate: { fontSize: 12, color: COLORS.textSecondary, flex: 1, textAlign: 'right' },
});
