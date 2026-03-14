import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/lib/constants';
import { Question } from '@/lib/types';
import { getWrongNotes, resolveWrongNote, WrongNote } from '@/lib/storage';
import { fetchQuestionById } from '@/lib/examData';
import { useStudyState } from '@/hooks/useStudyState';
import StudyView from '@/components/exam/StudyView';

interface ReviewQuestion {
  question: Question;
  wrongNote: WrongNote;
}

export default function ReviewScreen() {
  const router = useRouter();
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);

  const onCorrect = useCallback((question: Question) => {
    const rq = reviewQuestions.find((r) => r.question.id === question.id);
    if (rq) resolveWrongNote(rq.wrongNote.questionId, rq.wrongNote.examId);
  }, [reviewQuestions]);

  const study = useStudyState({ onCorrect });

  useEffect(() => {
    (async () => {
      const notes = await getWrongNotes();
      const unresolved = notes.filter((n) => !n.isResolved);
      const questions: ReviewQuestion[] = [];
      for (const note of unresolved) {
        const q = await fetchQuestionById(note.questionId);
        if (q) questions.push({ question: q, wrongNote: note });
      }
      // Sort by wrongCount desc (most problematic first)
      questions.sort((a, b) => b.wrongNote.wrongCount - a.wrongNote.wrongCount);
      setReviewQuestions(questions);
      study.startStudy(questions.map((rq) => rq.question));
      setLoaded(true);
    })();
  }, []);

  if (!loaded) return null;

  if (reviewQuestions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: '오답 복습' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>복습할 오답이 없습니다!</Text>
          <Text style={styles.emptyDesc}>모의고사를 풀면 틀린 문제가 여기에 표시됩니다.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (study.completed) {
    return (
      <>
        <Stack.Screen options={{ title: '복습 결과' }} />
        <View style={styles.resultContainer}>
          <Text style={styles.resultIcon}>{study.correctCount === study.questions.length ? '🎉' : '💪'}</Text>
          <Text style={styles.resultTitle}>복습 완료!</Text>
          <Text style={styles.resultScore}>
            {study.questions.length}문항 중 {study.correctCount}문항 정답
          </Text>
          <Text style={styles.resultDesc}>
            {study.correctCount === study.questions.length
              ? '모든 문제를 맞혔습니다! 오답이 해결되었습니다.'
              : `${study.questions.length - study.correctCount}문항은 아직 미해결 상태입니다. 다시 도전해보세요!`}
          </Text>
          <View style={styles.resultActions}>
            <Pressable style={styles.actionBtn} onPress={() => router.back()}>
              <Text style={styles.actionBtnText}>돌아가기</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => study.startStudy(reviewQuestions.map((rq) => rq.question))}
            >
              <Text style={styles.primaryBtnText}>다시 복습</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  // Find the current review question for wrongCount info
  const currentReview = reviewQuestions[study.currentIndex];

  const renderFeedback = (isCorrect: boolean, correctAnswer: number) => (
    <View style={[styles.feedbackBox, isCorrect ? styles.correctFeedback : styles.wrongFeedback]}>
      <Ionicons
        name={isCorrect ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={isCorrect ? '#16A34A' : '#DC2626'}
      />
      <Text style={[styles.feedbackText, { color: isCorrect ? '#16A34A' : '#DC2626' }]}>
        {isCorrect
          ? '정답! 이 문제는 해결 처리되었습니다.'
          : `오답! 정답은 ${correctAnswer}번`}
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: '오답 복습' }} />
      <StudyView
        current={study.current!}
        currentIndex={study.currentIndex}
        totalQuestions={study.questions.length}
        selectedAnswer={study.selectedAnswer}
        showResult={study.showResult}
        onSelect={study.handleSelect}
        onConfirm={study.handleConfirm}
        onNext={study.handleNext}
        isLastQuestion={study.currentIndex >= study.questions.length - 1}
        progressSuffix={currentReview ? `(틀린 횟수: ${currentReview.wrongNote.wrongCount}회)` : undefined}
        renderFeedback={renderFeedback}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  feedbackBox: {
    marginTop: 16, padding: 14, borderRadius: RADIUS.sm,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  correctFeedback: { backgroundColor: '#F0FDF4' },
  wrongFeedback: { backgroundColor: '#FEF2F2' },
  feedbackText: { fontSize: 14, fontWeight: '700' },

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
  primaryBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
