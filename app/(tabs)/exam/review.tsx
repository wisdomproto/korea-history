import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/lib/constants';
import { Question } from '@/lib/types';
import { getWrongNotes, resolveWrongNote, WrongNote } from '@/lib/storage';
import { fetchQuestionById } from '@/lib/examData';
import { useStudyState } from '@/hooks/useStudyState';
import StudyView from '@/components/exam/StudyView';

interface ReviewQuestion {
  question: Question;
  wrongNote: WrongNote;
}

type ViewMode = 'list' | 'study';
type FilterMode = 'all' | 'unresolved' | 'resolved';

export default function ReviewScreen() {
  const router = useRouter();
  const [allReviewQuestions, setAllReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<FilterMode>('all');

  const onCorrect = useCallback((question: Question) => {
    const rq = allReviewQuestions.find((r) => r.question.id === question.id);
    if (rq) {
      resolveWrongNote(rq.wrongNote.questionId, rq.wrongNote.examId);
      // Update local state to reflect resolved status
      setAllReviewQuestions((prev) =>
        prev.map((r) =>
          r.question.id === question.id
            ? { ...r, wrongNote: { ...r.wrongNote, isResolved: true } }
            : r,
        ),
      );
    }
  }, [allReviewQuestions]);

  const study = useStudyState({ onCorrect });

  useEffect(() => {
    (async () => {
      const notes = await getWrongNotes();
      const questions: ReviewQuestion[] = [];
      for (const note of notes) {
        const q = await fetchQuestionById(note.questionId);
        if (q) questions.push({ question: q, wrongNote: note });
      }
      // Sort by most recent first, then by wrongCount desc
      questions.sort((a, b) => {
        const dateA = new Date(a.wrongNote.lastWrongAt).getTime();
        const dateB = new Date(b.wrongNote.lastWrongAt).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.wrongNote.wrongCount - a.wrongNote.wrongCount;
      });
      setAllReviewQuestions(questions);
      setLoaded(true);
    })();
  }, []);

  const filteredQuestions = allReviewQuestions.filter((rq) => {
    if (filter === 'unresolved') return !rq.wrongNote.isResolved;
    if (filter === 'resolved') return rq.wrongNote.isResolved;
    return true;
  });

  const unresolvedQuestions = allReviewQuestions.filter((rq) => !rq.wrongNote.isResolved);
  const resolvedCount = allReviewQuestions.filter((rq) => rq.wrongNote.isResolved).length;

  const startStudy = useCallback((questions: ReviewQuestion[]) => {
    study.startStudy(questions.map((rq) => rq.question));
    setViewMode('study');
  }, [study]);

  const startSingleStudy = useCallback((rq: ReviewQuestion) => {
    study.startStudy([rq.question]);
    setViewMode('study');
  }, [study]);

  // Loading
  if (!loaded) {
    return (
      <>
        <Stack.Screen options={{ title: '오답 노트' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>불러오는 중...</Text>
        </View>
      </>
    );
  }

  // Empty state
  if (allReviewQuestions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: '오답 노트' }} />
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>오답 기록이 없습니다</Text>
          <Text style={styles.emptyDesc}>모의고사를 풀면 틀린 문제가 여기에 기록됩니다.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // Study mode - completed
  if (viewMode === 'study' && study.completed) {
    return (
      <>
        <Stack.Screen options={{ title: '복습 결과' }} />
        <View style={styles.resultContainer}>
          <Ionicons
            name={study.correctCount === study.questions.length ? 'trophy' : 'fitness'}
            size={56}
            color={study.correctCount === study.questions.length ? '#F59E0B' : COLORS.primary}
          />
          <Text style={styles.resultTitle}>복습 완료!</Text>
          <Text style={styles.resultScore}>
            {study.questions.length}문항 중 {study.correctCount}문항 정답
          </Text>
          <Text style={styles.resultDesc}>
            {study.correctCount === study.questions.length
              ? '모든 문제를 맞혔습니다!'
              : `${study.questions.length - study.correctCount}문항은 아직 미해결 상태입니다.`}
          </Text>
          <View style={styles.resultActions}>
            <Pressable style={styles.actionBtn} onPress={() => setViewMode('list')}>
              <Text style={styles.actionBtnText}>목록으로</Text>
            </Pressable>
            {unresolvedQuestions.length > 0 && (
              <Pressable
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={() => startStudy(unresolvedQuestions)}
              >
                <Text style={styles.primaryBtnText}>미해결 복습</Text>
              </Pressable>
            )}
          </View>
        </View>
      </>
    );
  }

  // Study mode - in progress
  if (viewMode === 'study' && study.current) {
    const currentReview = allReviewQuestions.find((rq) => rq.question.id === study.current!.id);
    return (
      <>
        <Stack.Screen
          options={{
            title: '오답 복습',
            headerLeft: () => (
              <Pressable onPress={() => setViewMode('list')} style={{ marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </Pressable>
            ),
          }}
        />
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
          progressSuffix={currentReview ? `(틀린 횟수: ${currentReview.wrongNote.wrongCount}회)` : undefined}
          correctFeedbackMessage="정답! 이 문제는 해결 처리되었습니다."
        />
      </>
    );
  }

  // List mode (history)
  return (
    <>
      <Stack.Screen options={{ title: '오답 노트' }} />
      <View style={styles.container}>
        <View style={styles.contentWrap}>
          {/* Summary header */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{allReviewQuestions.length}</Text>
                <Text style={styles.statLabel}>전체</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#EF4444' }]}>{unresolvedQuestions.length}</Text>
                <Text style={styles.statLabel}>미해결</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#22C55E' }]}>{resolvedCount}</Text>
                <Text style={styles.statLabel}>해결</Text>
              </View>
            </View>
            {unresolvedQuestions.length > 0 && (
              <Pressable
                style={styles.studyAllBtn}
                onPress={() => startStudy(unresolvedQuestions)}
              >
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.studyAllBtnText}>미해결 복습 ({unresolvedQuestions.length})</Text>
              </Pressable>
            )}
          </View>

          {/* Filter tabs */}
          <View style={styles.filterBar}>
            {(['all', 'unresolved', 'resolved'] as FilterMode[]).map((f) => {
              const labels = { all: '전체', unresolved: '미해결', resolved: '해결' };
              const isActive = filter === f;
              return (
                <Pressable
                  key={f}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {labels[f]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Question list */}
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
            {filteredQuestions.length === 0 ? (
              <View style={styles.filterEmpty}>
                <Text style={styles.filterEmptyText}>
                  {filter === 'unresolved' ? '미해결 오답이 없습니다!' : '해결된 오답이 없습니다.'}
                </Text>
              </View>
            ) : (
              filteredQuestions.map((rq) => (
                <Pressable
                  key={`${rq.wrongNote.examId}-${rq.wrongNote.questionId}`}
                  style={styles.noteCard}
                  onPress={() => startSingleStudy(rq)}
                >
                  <View style={styles.noteHeader}>
                    <View style={styles.noteLeft}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: rq.wrongNote.isResolved ? '#22C55E' : '#EF4444' },
                      ]} />
                      <Text style={styles.noteExam}>제{rq.wrongNote.questionNumber}번</Text>
                      <View style={styles.eraBadge}>
                        <Text style={styles.eraBadgeText}>{rq.wrongNote.era}</Text>
                      </View>
                    </View>
                    <View style={styles.noteRight}>
                      <Text style={styles.wrongCountBadge}>
                        {rq.wrongNote.wrongCount}회 오답
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                    </View>
                  </View>
                  <Text style={styles.noteContent} numberOfLines={2}>
                    {rq.question.content}
                  </Text>
                  <View style={styles.noteMeta}>
                    <Text style={styles.noteMetaText}>
                      {rq.wrongNote.isResolved ? '해결됨' : '미해결'}
                    </Text>
                    <Text style={styles.noteMetaText}>
                      {formatDate(rq.wrongNote.lastWrongAt)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </>
  );
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  } catch {
    return '';
  }
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
    alignSelf: 'center' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Summary bar
  summaryBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  studyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  studyAllBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Filter tabs
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F0FF',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },

  // List
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  filterEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  filterEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Note card
  noteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    ...SHADOWS.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noteExam: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  eraBadge: {
    backgroundColor: '#F1F0FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eraBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  noteRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wrongCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  noteContent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteMetaText: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // Result
  resultContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  resultDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resultActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  primaryBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
