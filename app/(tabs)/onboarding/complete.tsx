import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, ERAS } from '@/lib/constants';
import { getStudyPlan } from '@/lib/storage';
import { StudyPlan } from '@/lib/types';

function getDday(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function OnboardingComplete() {
  const router = useRouter();
  const { goalGrade, examDate, dailyMinutes } = useLocalSearchParams<{
    goalGrade: string;
    examDate: string;
    dailyMinutes: string;
  }>();
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  useEffect(() => {
    getStudyPlan().then(setPlan);
  }, []);

  const dday = examDate ? getDday(examDate) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.celebration}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>학습 플랜 완성!</Text>
          <Text style={styles.subtitle}>
            맞춤형 학습 플랜이 생성되었습니다
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>목표 급수</Text>
            <Text style={styles.summaryValue}>{goalGrade}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>시험일</Text>
            <Text style={styles.summaryValue}>D-{dday}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>일일 학습</Text>
            <Text style={styles.summaryValue}>{dailyMinutes}분</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>총 기간</Text>
            <Text style={styles.summaryValue}>
              {plan ? `${plan.totalWeeks}주` : '...'}
            </Text>
          </View>
        </View>

        {plan && (
          <View style={styles.planSection}>
            <Text style={styles.planTitle}>📋 주차별 학습 플랜</Text>
            {plan.weeklyPlan.map((week) => (
              <View key={week.week} style={styles.weekCard}>
                <View style={styles.weekHeader}>
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>{week.week}주차</Text>
                  </View>
                  {week.focusEras.length > 0 && week.focusEras.length <= 4 && (
                    <View style={styles.eraTags}>
                      {week.focusEras.map((era) => {
                        const eraConfig = ERAS.find((e) => e.key === era);
                        return (
                          <View
                            key={era}
                            style={[
                              styles.eraTag,
                              { backgroundColor: eraConfig?.color + '22' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.eraTagText,
                                { color: eraConfig?.color },
                              ]}
                            >
                              {eraConfig?.label || era}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
                {week.goals.map((goal, idx) => (
                  <Text key={idx} style={styles.goalText}>
                    • {goal}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.startButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.startButtonText}>학습 시작하기 🚀</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  celebration: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  planSection: {
    gap: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  weekCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  weekBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  eraTags: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  eraTag: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  eraTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    paddingLeft: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
