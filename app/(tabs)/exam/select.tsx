import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/lib/constants';
import { useExams } from '@/hooks/useExamData';
import { Exam } from '@/lib/types';
import { getSavedExam, clearSavedExam, SavedExamState } from '@/lib/storage';

export default function ExamSelectScreen() {
  const router = useRouter();
  const { data: EXAMS, isLoading: examsLoading } = useExams();
  const [savedExam, setSavedExam] = useState<SavedExamState | null>(null);

  // 저장된 시험 상태 확인
  useFocusEffect(
    useCallback(() => {
      getSavedExam().then(setSavedExam);
    }, [])
  );

  const pushToExam = (examId: number, resume?: boolean) => {
    router.push({
      pathname: '/exam/[examId]',
      params: { examId: String(examId), ...(resume ? { resume: '1' } : {}) },
    } as any);
  };

  const handleExamPress = (exam: Exam) => {
    if (!exam.isFree) {
      router.push('/premium');
      return;
    }

    // 중간 저장 상태가 있는 경우 (US-08)
    if (savedExam && savedExam.examId === exam.id) {
      const answeredCount = savedExam.answers.filter((a) => a.selectedAnswer !== null).length;
      const minutes = Math.floor(savedExam.remainingSeconds / 60);

      if (Platform.OS === 'web') {
        const resume = window.confirm(
          `이전에 풀던 시험이 있습니다.\n(${answeredCount}문항 답변, 잔여 ${minutes}분)\n\n이어서 풀까요?\n\n확인 = 이어서 풀기 / 취소 = 처음부터`,
        );
        if (resume) {
          pushToExam(exam.id, true);
        } else {
          clearSavedExam();
          setSavedExam(null);
          pushToExam(exam.id);
        }
        return;
      }

      Alert.alert(
        '진행 중인 모의고사',
        `이전에 풀던 시험이 있습니다.\n(${answeredCount}문항 답변, 잔여 ${minutes}분)\n\n이어서 풀까요?`,
        [
          {
            text: '처음부터',
            style: 'destructive',
            onPress: () => {
              clearSavedExam();
              setSavedExam(null);
              pushToExam(exam.id);
            },
          },
          {
            text: '이어서 풀기',
            onPress: () => pushToExam(exam.id, true),
          },
        ],
      );
      return;
    }

    // 다른 시험의 저장 상태가 있을 때
    if (savedExam && savedExam.examId !== exam.id) {
      const savedExamData = EXAMS.find((e) => e.id === savedExam.examId);

      if (Platform.OS === 'web') {
        const start = window.confirm(
          `제${savedExamData?.examNumber ?? '?'}회 모의고사가 진행 중입니다.\n새 모의고사를 시작하면 기존 진행이 삭제됩니다.\n\n새로 시작하시겠습니까?`,
        );
        if (start) {
          clearSavedExam();
          setSavedExam(null);
          pushToExam(exam.id);
        }
        return;
      }

      Alert.alert(
        '진행 중인 다른 모의고사',
        `제${savedExamData?.examNumber ?? '?'}회 모의고사가 진행 중입니다.\n새 모의고사를 시작하면 기존 진행이 삭제됩니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '새로 시작',
            style: 'destructive',
            onPress: () => {
              clearSavedExam();
              setSavedExam(null);
              pushToExam(exam.id);
            },
          },
        ],
      );
      return;
    }

    pushToExam(exam.id);
  };

  const renderExam = ({ item }: { item: Exam }) => {
    const hasSaved = savedExam?.examId === item.id;
    return (
      <Pressable
        style={[styles.examCard, !item.isFree && styles.locked]}
        onPress={() => handleExamPress(item)}
      >
        <View style={styles.examInfo}>
          <View style={styles.examHeader}>
            <Text style={styles.examNumber}>제{item.examNumber}회</Text>
            <View style={[
              styles.typeBadge,
              item.examType === 'advanced' ? styles.advancedBadge : styles.basicBadge,
            ]}>
              <Text style={styles.typeBadgeText}>
                {item.examType === 'advanced' ? '심화' : '기본'}
              </Text>
            </View>
            {hasSaved && (
              <View style={styles.resumeBadge}>
                <Text style={styles.resumeBadgeText}>진행중</Text>
              </View>
            )}
          </View>
          <Text style={styles.examDate}>{item.examDate}</Text>
          <Text style={styles.examMeta}>
            {item.totalQuestions}문항 · {item.timeLimitMinutes}분
          </Text>
        </View>
        {item.isFree ? (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        ) : (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>프리미엄</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'CBT 모의고사',
          headerBackTitle: '학습',
        }}
      />
      <View style={styles.container}>
        <View style={styles.contentWrap}>
        <Text style={styles.sectionTitle}>기출문제 회차 선택</Text>
        <Text style={styles.sectionDesc}>
          풀고 싶은 회차를 선택하세요. 실제 시험과 동일한 환경으로 진행됩니다.
        </Text>
        {examsLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={EXAMS.filter(e => e.isVisible !== false)}
            renderItem={renderExam}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentWrap: {
    flex: 1,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  examCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F4',
    ...SHADOWS.sm,
  },
  locked: {
    opacity: 0.5,
  },
  examInfo: {
    flex: 1,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  examNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  advancedBadge: {
    backgroundColor: COLORS.primaryLight,
  },
  basicBadge: {
    backgroundColor: '#FEF3C7',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  resumeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  resumeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  examDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  examMeta: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.textLight,
  },
  premiumBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});
