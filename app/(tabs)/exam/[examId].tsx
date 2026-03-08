import { useCallback, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Alert, AppState, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { useExamWithQuestions } from '@/hooks/useExamData';
import { useExam } from '@/hooks/useExam';
import { useTimer } from '@/hooks/useTimer';
import { Question, UserAnswer } from '@/lib/types';
import { getSavedExam, clearSavedExam, SavedExamState } from '@/lib/storage';
import QuestionCard from '@/components/exam/QuestionCard';
import ChoiceList from '@/components/exam/ChoiceList';
import QuestionNav from '@/components/exam/QuestionNav';
import Timer from '@/components/exam/Timer';

export default function ExamScreen() {
  const { examId, resume: resumeParam } = useLocalSearchParams<{
    examId: string;
    resume?: string;
  }>();
  const router = useRouter();
  const hasSubmittedRef = useRef(false);
  const [savedState, setSavedState] = useState<SavedExamState | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { data: { exam, questions }, isLoading: dataLoading } = useExamWithQuestions(Number(examId));

  // 저장된 상태 확인
  useEffect(() => {
    if (resumeParam === '1') {
      getSavedExam().then((saved) => {
        if (saved && saved.examId === Number(examId)) {
          setSavedState(saved);
        }
        setIsReady(true);
      });
    } else {
      clearSavedExam();
      setIsReady(true);
    }
  }, [examId, resumeParam]);

  // 저장된 답안 복원
  const initialAnswers: UserAnswer[] | undefined = savedState
    ? savedState.answers.map((a) => ({
        questionId: a.questionId,
        questionNumber: a.questionNumber,
        selectedAnswer: a.selectedAnswer,
      }))
    : undefined;

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
    setExamId,
    saveState,
  } = useExam(questions, {
    initialAnswers,
    initialIndex: savedState?.currentIndex,
  });

  const doSubmit = useCallback((isAutoSubmit = false) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    // 제출 시 저장 상태 삭제
    clearSavedExam();

    const results = submitExam();
    let earnedPoints = 0;
    let totalPoints = 0;
    results.forEach((r) => {
      const q = questions.find((q: Question) => q.id === r.questionId);
      if (q) {
        totalPoints += q.points;
        if (r.isCorrect) earnedPoints += q.points;
      }
    });
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const correctCount = results.filter((r) => r.isCorrect).length;

    router.replace({
      pathname: '/exam/result/[examId]',
      params: {
        examId: String(exam!.id),
        score: String(score),
        correct: String(correctCount),
        total: String(totalQuestions),
        earnedPoints: String(earnedPoints),
        totalPoints: String(totalPoints),
        answers: JSON.stringify(results),
        autoSubmit: isAutoSubmit ? '1' : '0',
      },
    });
  }, [submitExam, questions, totalQuestions, exam, router]);

  const handleTimeUp = useCallback(() => {
    Alert.alert(
      '시간 종료',
      '시험 시간이 종료되었습니다.\n답안이 자동 제출됩니다.',
      [{ text: '확인', onPress: () => doSubmit(true) }],
    );
  }, [doSubmit]);

  const handleWarning = useCallback(() => {
    Alert.alert('잔여 시간 알림', '남은 시간이 5분입니다.');
  }, []);

  const { formattedTime, isWarning, progress, remainingSeconds } = useTimer({
    totalMinutes: exam?.timeLimitMinutes ?? 15,
    initialSeconds: savedState?.remainingSeconds,
    warningMinutes: 5,
    onTimeUp: handleTimeUp,
    onWarning: handleWarning,
  });

  // 시험 ID 설정 + 자동 저장
  useEffect(() => {
    if (exam) setExamId(exam.id);
  }, [exam, setExamId]);

  // 앱 백그라운드 전환 시 자동 저장 (US-08)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!hasSubmittedRef.current) {
          saveState(remainingSeconds);
        }
      }
    });
    return () => subscription.remove();
  }, [saveState, remainingSeconds]);

  // 30초마다 자동 저장
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasSubmittedRef.current) {
        saveState(remainingSeconds);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [saveState, remainingSeconds]);

  if (!isReady || dataLoading) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12 }}>불러오는 중...</Text>
      </View>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text>시험 데이터를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const handleSubmit = () => {
    const unanswered = totalQuestions - answeredCount;
    const message = unanswered > 0
      ? `아직 ${unanswered}문항을 풀지 않았습니다.\n그래도 제출하시겠습니까?`
      : '모의고사를 제출하시겠습니까?';

    Alert.alert('제출 확인', message, [
      { text: '취소', style: 'cancel' },
      { text: '제출하기', onPress: () => doSubmit(false) },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `제${exam.examNumber}회 모의고사`,
          headerBackTitle: '목록',
          headerRight: () => (
            <Pressable onPress={handleSubmit}>
              <Text style={styles.submitHeaderBtn}>제출</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
       <View style={styles.contentWrap}>
        <Timer
          formattedTime={formattedTime}
          isWarning={isWarning}
          progress={progress}
        />

        <View style={styles.navBar}>
          <QuestionNav
            answers={answers}
            currentIndex={currentIndex}
            onPress={goToQuestion}
          />
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

          <Text style={styles.progress}>
            {answeredCount} / {totalQuestions} 답변
          </Text>

          {currentIndex < totalQuestions - 1 ? (
            <Pressable style={styles.navButton} onPress={goNext}>
              <Text style={styles.navButtonText}>다음 ▶</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>제출하기</Text>
            </Pressable>
          )}
        </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitHeaderBtn: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  navBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    minWidth: 80,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  navButtonTextDisabled: {
    color: COLORS.textLight,
  },
  progress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
