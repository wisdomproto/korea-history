import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/lib/constants';

// 시험 일정 (향후 실시간 데이터로 교체 가능)
const UPCOMING_EXAMS = [
  { id: 76, date: '2025-10-18', label: '제76회 (2025.10.18)' },
  { id: 77, date: '2026-02-07', label: '제77회 (2026.02.07)' },
  { id: 78, date: '2026-06-13', label: '제78회 (2026.06.13)' },
  { id: 79, date: '2026-10-17', label: '제79회 (2026.10.17)' },
];

function getDday(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function OnboardingStep2() {
  const router = useRouter();
  const { goalGrade } = useLocalSearchParams<{ goalGrade: string }>();
  const [selectedExam, setSelectedExam] = useState<string | null>(null);

  const dday = useMemo(() => {
    if (!selectedExam) return null;
    return getDday(selectedExam);
  }, [selectedExam]);

  const handleNext = () => {
    if (!selectedExam) return;
    router.push({
      pathname: '/onboarding/step3',
      params: { goalGrade, examDate: selectedExam },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDone]} />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.stepLabel}>2 / 3</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.title}>시험일을 선택하세요</Text>
        <Text style={styles.subtitle}>
          D-day를 설정하면 맞춤 학습 일정을 만들어 드려요
        </Text>

        <View style={styles.examList}>
          {UPCOMING_EXAMS.map((exam) => {
            const d = getDday(exam.date);
            const isPast = d < 0;
            return (
              <Pressable
                key={exam.id}
                style={[
                  styles.examCard,
                  selectedExam === exam.date && styles.examCardSelected,
                  isPast && styles.examCardPast,
                ]}
                onPress={() => !isPast && setSelectedExam(exam.date)}
                disabled={isPast}
              >
                <View style={styles.examInfo}>
                  <Text
                    style={[
                      styles.examLabel,
                      selectedExam === exam.date && styles.examLabelSelected,
                      isPast && styles.examLabelPast,
                    ]}
                  >
                    {exam.label}
                  </Text>
                  <Text
                    style={[
                      styles.examDday,
                      isPast && styles.examLabelPast,
                    ]}
                  >
                    {isPast ? '종료' : `D-${d}`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedExam === exam.date && styles.radioSelected,
                  ]}
                >
                  {selectedExam === exam.date && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {dday !== null && dday > 0 && (
          <View style={styles.ddayBanner}>
            <Text style={styles.ddayNumber}>D-{dday}</Text>
            <Text style={styles.ddayText}>
              시험까지 {dday}일 남았습니다. {'\n'}
              {dday >= 60
                ? '충분한 시간이 있어요! 꾸준히 해봐요 💪'
                : dday >= 30
                ? '적절한 시간이에요! 집중해서 준비해요 📚'
                : '시간이 촉박해요! 핵심 위주로 준비해요 🔥'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !selectedExam && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedExam}
        >
          <Text style={styles.nextButtonText}>다음</Text>
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
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  stepActive: {
    backgroundColor: COLORS.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDone: {
    backgroundColor: COLORS.success,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: COLORS.border,
  },
  stepLineDone: {
    backgroundColor: COLORS.success,
  },
  stepLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  examList: {
    gap: 10,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  examCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF3FC',
  },
  examCardPast: {
    opacity: 0.4,
  },
  examInfo: {
    flex: 1,
  },
  examLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  examLabelSelected: {
    color: COLORS.primary,
  },
  examLabelPast: {
    color: COLORS.textLight,
  },
  examDday: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '700',
    marginTop: 4,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  ddayBanner: {
    marginTop: 24,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  ddayNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  ddayText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
