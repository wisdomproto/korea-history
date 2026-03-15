import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { showAlert, showConfirm } from '@/lib/alert';
import { useRouter, Stack } from 'expo-router';
import { COLORS, ERAS } from '@/lib/constants';
import { getUserProfile, saveUserProfile, saveStudyPlan } from '@/lib/storage';
import { UserProfile } from '@/lib/types';
import { generateStudyPlan } from '@/lib/planGenerator';

const GRADES = ['1급', '2급', '3급', '4급', '5급', '6급'];
const DAILY_OPTIONS = [30, 60, 90, 120];

const UPCOMING_EXAMS = [
  { round: 78, date: '2026-06-13', label: '제78회 (2026.06.13)' },
  { round: 79, date: '2026-10-17', label: '제79회 (2026.10.17)' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalGrade, setGoalGrade] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (p) {
        setProfile(p);
        setGoalGrade(p.goalGrade);
        setExamDate(p.examDate);
        setDailyMinutes(p.dailyStudyMinutes);
      }
    });
  }, []);

  const handleSave = () => {
    if (!goalGrade || !examDate) {
      showAlert('알림', '목표 급수와 시험일을 선택해주세요.');
      return;
    }

    showConfirm(
      '학습 플랜 재생성',
      '설정을 변경하면 학습 플랜이 자동으로 재생성됩니다.\n기존 학습 기록은 유지됩니다.\n\n진행하시겠습니까?',
      async () => {
        const updatedProfile: UserProfile = {
          goalGrade,
          examDate,
          dailyStudyMinutes: dailyMinutes,
          onboardingCompleted: true,
          createdAt: profile?.createdAt || new Date().toISOString(),
        };
        await saveUserProfile(updatedProfile);

        const newPlan = generateStudyPlan(updatedProfile);
        await saveStudyPlan(newPlan);

        showAlert('저장 완료', '학습 플랜이 업데이트되었습니다.');
        router.back();
      },
      '저장',
    );
  };

  const checkChanged = (grade: string, date: string, mins: number) => {
    setHasChanged(
      grade !== profile?.goalGrade ||
      date !== profile?.examDate ||
      mins !== profile?.dailyStudyMinutes
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: '학습 설정', headerBackTitle: '뒤로' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {/* 목표 급수 */}
        <Text style={styles.sectionTitle}>목표 급수</Text>
        <View style={styles.optionGrid}>
          {GRADES.map((grade) => (
            <Pressable
              key={grade}
              style={[styles.optionCard, goalGrade === grade && styles.optionSelected]}
              onPress={() => {
                setGoalGrade(grade);
                checkChanged(grade, examDate, dailyMinutes);
              }}
            >
              <Text style={[styles.optionText, goalGrade === grade && styles.optionTextSelected]}>
                {grade}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 시험일 */}
        <Text style={styles.sectionTitle}>시험일</Text>
        {UPCOMING_EXAMS.map((exam) => {
          const target = new Date(exam.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          target.setHours(0, 0, 0, 0);
          const dday = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isPast = dday <= 0;

          return (
            <Pressable
              key={exam.round}
              style={[
                styles.examOption,
                isPast && styles.examPast,
                examDate === exam.date && styles.examSelected,
              ]}
              onPress={() => {
                if (isPast) return;
                setExamDate(exam.date);
                checkChanged(goalGrade, exam.date, dailyMinutes);
              }}
              disabled={isPast}
            >
              <View>
                <Text style={[styles.examLabel, isPast && styles.examPastText]}>
                  {exam.label}
                </Text>
                <Text style={[styles.examDday, isPast && styles.examPastText]}>
                  {isPast ? '종료' : `D-${dday}`}
                </Text>
              </View>
              <View style={[styles.radio, examDate === exam.date && styles.radioSelected]}>
                {examDate === exam.date && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}

        {/* 학습 시간 */}
        <Text style={styles.sectionTitle}>하루 학습 시간</Text>
        <View style={styles.optionGrid}>
          {DAILY_OPTIONS.map((mins) => (
            <Pressable
              key={mins}
              style={[styles.optionCard, dailyMinutes === mins && styles.optionSelected]}
              onPress={() => {
                setDailyMinutes(mins);
                checkChanged(goalGrade, examDate, mins);
              }}
            >
              <Text style={[styles.optionText, dailyMinutes === mins && styles.optionTextSelected]}>
                {mins >= 60 ? `${mins / 60}시간${mins % 60 > 0 ? ` ${mins % 60}분` : ''}` : `${mins}분`}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.saveButton, !hasChanged && styles.saveDisabled]}
          onPress={handleSave}
          disabled={!hasChanged}
        >
          <Text style={[styles.saveText, !hasChanged && styles.saveDisabledText]}>
            저장하기
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12, marginTop: 20,
  },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionCard: {
    backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 2, borderColor: 'transparent', minWidth: 80, alignItems: 'center',
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#F0F6FF' },
  optionText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  optionTextSelected: { color: COLORS.primary },

  examOption: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  examSelected: { borderColor: COLORS.primary, backgroundColor: '#F0F6FF' },
  examPast: { opacity: 0.4 },
  examLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  examDday: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  examPastText: { color: COLORS.textLight },

  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: COLORS.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },

  saveButton: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveDisabled: { backgroundColor: COLORS.disabled },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  saveDisabledText: { color: COLORS.textLight },
});
