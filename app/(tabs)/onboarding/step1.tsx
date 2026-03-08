import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/lib/constants';

const GRADES = [
  { value: '1급' as const, label: '1급', desc: '심화 (80점 이상)', icon: '🏆' },
  { value: '2급' as const, label: '2급', desc: '심화 (70점 이상)', icon: '🥇' },
  { value: '3급' as const, label: '3급', desc: '심화 (60점 이상)', icon: '🥈' },
  { value: '4급' as const, label: '4급', desc: '기본 (80점 이상)', icon: '📘' },
  { value: '5급' as const, label: '5급', desc: '기본 (70점 이상)', icon: '📗' },
  { value: '6급' as const, label: '6급', desc: '기본 (60점 이상)', icon: '📙' },
];

export default function OnboardingStep1() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = () => {
    if (!selected) return;
    router.push({ pathname: '/onboarding/step2', params: { goalGrade: selected } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.stepLabel}>1 / 3</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>목표 급수를 선택하세요</Text>
        <Text style={styles.subtitle}>
          맞춤형 학습 플랜을 만들어 드립니다
        </Text>

        <View style={styles.gradeList}>
          {GRADES.map((grade) => (
            <Pressable
              key={grade.value}
              style={[
                styles.gradeCard,
                selected === grade.value && styles.gradeCardSelected,
              ]}
              onPress={() => setSelected(grade.value)}
            >
              <Text style={styles.gradeIcon}>{grade.icon}</Text>
              <View style={styles.gradeInfo}>
                <Text
                  style={[
                    styles.gradeLabel,
                    selected === grade.value && styles.gradeLabelSelected,
                  ]}
                >
                  {grade.label}
                </Text>
                <Text style={styles.gradeDesc}>{grade.desc}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selected === grade.value && styles.radioSelected,
                ]}
              >
                {selected === grade.value && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !selected && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.nextButtonText}>다음</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>나중에 설정하기</Text>
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
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: COLORS.border,
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
  gradeList: {
    gap: 10,
  },
  gradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF3FC',
  },
  gradeIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  gradeInfo: {
    flex: 1,
  },
  gradeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  gradeLabelSelected: {
    color: COLORS.primary,
  },
  gradeDesc: {
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
    alignItems: 'center',
    gap: 16,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  skipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
