import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { UserProfile } from '@/lib/types';
import { saveUserProfile, saveStudyPlan } from '@/lib/storage';
import { generateStudyPlan } from '@/lib/planGenerator';

const TIME_OPTIONS = [
  { value: 30 as const, label: '30분', desc: '가벼운 복습', icon: '☕' },
  { value: 60 as const, label: '1시간', desc: '기본 학습', icon: '📖' },
  { value: 90 as const, label: '1시간 30분', desc: '집중 학습', icon: '🔥' },
  { value: 120 as const, label: '2시간', desc: '심화 학습', icon: '🚀' },
];

export default function OnboardingStep3() {
  const router = useRouter();
  const { goalGrade, examDate } = useLocalSearchParams<{
    goalGrade: string;
    examDate: string;
  }>();
  const [selectedTime, setSelectedTime] = useState<30 | 60 | 90 | 120 | null>(null);
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!selectedTime || !goalGrade || !examDate) return;
    setSaving(true);

    try {
      const profile: UserProfile = {
        goalGrade: goalGrade as UserProfile['goalGrade'],
        examDate,
        dailyStudyMinutes: selectedTime,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(profile);

      const plan = generateStudyPlan(profile);
      await saveStudyPlan(plan);

      router.replace({
        pathname: '/onboarding/complete',
        params: { goalGrade, examDate, dailyMinutes: String(selectedTime) },
      });
    } catch (e) {
      console.error('온보딩 저장 실패:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDone]} />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepDone]} />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepActive]} />
        </View>
        <Text style={styles.stepLabel}>3 / 3</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>하루 학습 시간을 정해요</Text>
        <Text style={styles.subtitle}>
          매일 꾸준히 할 수 있는 시간을 선택하세요
        </Text>

        <View style={styles.timeList}>
          {TIME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.timeCard,
                selectedTime === opt.value && styles.timeCardSelected,
              ]}
              onPress={() => setSelectedTime(opt.value)}
            >
              <Text style={styles.timeIcon}>{opt.icon}</Text>
              <View style={styles.timeInfo}>
                <Text
                  style={[
                    styles.timeLabel,
                    selectedTime === opt.value && styles.timeLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.timeDesc}>{opt.desc}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selectedTime === opt.value && styles.radioSelected,
                ]}
              >
                {selectedTime === opt.value && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.completeButton,
            (!selectedTime || saving) && styles.completeButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!selectedTime || saving}
        >
          <Text style={styles.completeButtonText}>
            {saving ? '학습 플랜 생성 중...' : '학습 플랜 만들기'}
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 24,
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
  timeList: {
    gap: 12,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF3FC',
  },
  timeIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  timeLabelSelected: {
    color: COLORS.primary,
  },
  timeDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  completeButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
