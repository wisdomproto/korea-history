import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, ERAS, CATEGORIES } from '@/lib/constants';
import { Question, Era, Category } from '@/lib/types';
import { getWrongNotes, resolveWrongNote, batchUpdateResolved, batchDeleteWrongNotes, WrongNote } from '@/lib/storage';
import { fetchQuestionById } from '@/lib/examData';
import { useStudyState } from '@/hooks/useStudyState';
import StudyView from '@/components/exam/StudyView';
import { showConfirm } from '@/lib/alert';

interface ReviewQuestion {
  question: Question;
  wrongNote: WrongNote;
}

type NoteKey = string;
function noteKey(n: WrongNote): NoteKey { return `${n.examId}-${n.questionId}`; }

type ViewMode = 'list' | 'study';
type MainTab = 'all' | 'analysis';
type FilterMode = 'all' | 'unresolved' | 'resolved';
type AnalysisTab = 'era' | 'category' | 'keyword';

interface AnalysisBucket {
  key: string;
  label: string;
  color?: string;
  count: number;
  questions: ReviewQuestion[];
}

export default function ReviewScreen() {
  const router = useRouter();
  const [allReviewQuestions, setAllReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mainTab, setMainTab] = useState<MainTab>('all');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('era');

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<NoteKey>>(new Set());

  const onCorrect = useCallback((question: Question) => {
    const rq = allReviewQuestions.find((r) => r.question.id === question.id);
    if (rq) {
      resolveWrongNote(rq.wrongNote.questionId, rq.wrongNote.examId);
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

  // Analysis data
  const analysisByEra = useMemo((): AnalysisBucket[] => {
    const map = new Map<Era, ReviewQuestion[]>();
    allReviewQuestions.forEach((rq) => {
      const era = rq.wrongNote.era;
      if (!map.has(era)) map.set(era, []);
      map.get(era)!.push(rq);
    });
    return ERAS
      .filter((e) => map.has(e.key))
      .map((e) => ({
        key: e.key, label: e.label, color: e.color,
        count: map.get(e.key)!.length,
        questions: map.get(e.key)!,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allReviewQuestions]);

  const analysisByCategory = useMemo((): AnalysisBucket[] => {
    const map = new Map<Category, ReviewQuestion[]>();
    allReviewQuestions.forEach((rq) => {
      const cat = rq.wrongNote.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(rq);
    });
    const catColors: Record<string, string> = { '정치': '#EF4444', '경제': '#F59E0B', '사회': '#22C55E', '문화': '#6366F1' };
    return CATEGORIES
      .filter((c) => map.has(c.key))
      .map((c) => ({
        key: c.key, label: c.label, color: catColors[c.key],
        count: map.get(c.key)!.length,
        questions: map.get(c.key)!,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allReviewQuestions]);

  const analysisByKeyword = useMemo((): AnalysisBucket[] => {
    const map = new Map<string, ReviewQuestion[]>();
    allReviewQuestions.forEach((rq) => {
      const kws = rq.question.keywords;
      if (kws && kws.length > 0) {
        kws.forEach((kw) => {
          if (!map.has(kw)) map.set(kw, []);
          map.get(kw)!.push(rq);
        });
      } else {
        const key = '키워드 없음';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(rq);
      }
    });
    return Array.from(map.entries())
      .map(([key, questions]) => ({
        key, label: key, count: questions.length, questions,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allReviewQuestions]);

  const currentAnalysis = analysisTab === 'era' ? analysisByEra : analysisTab === 'category' ? analysisByCategory : analysisByKeyword;

  const startStudy = useCallback((questions: ReviewQuestion[]) => {
    study.startStudy(questions.map((rq) => rq.question));
    setViewMode('study');
  }, [study]);

  const startSingleStudy = useCallback((rq: ReviewQuestion) => {
    study.startStudy([rq.question]);
    setViewMode('study');
  }, [study]);

  // Selection helpers
  const toggleSelect = (key: NoteKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filteredKeys = filteredQuestions.map((rq) => noteKey(rq.wrongNote));
    const allSelected = filteredKeys.every((k) => selected.has(k));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const getSelectedNotes = (): { questionId: number; examId: number }[] => {
    return allReviewQuestions
      .filter((rq) => selected.has(noteKey(rq.wrongNote)))
      .map((rq) => ({ questionId: rq.wrongNote.questionId, examId: rq.wrongNote.examId }));
  };

  const handleBatchResolve = async () => {
    const keys = getSelectedNotes();
    await batchUpdateResolved(keys, true);
    setAllReviewQuestions((prev) =>
      prev.map((rq) =>
        selected.has(noteKey(rq.wrongNote))
          ? { ...rq, wrongNote: { ...rq.wrongNote, isResolved: true } }
          : rq,
      ),
    );
    exitSelectMode();
  };

  const handleBatchUnresolve = async () => {
    const keys = getSelectedNotes();
    await batchUpdateResolved(keys, false);
    setAllReviewQuestions((prev) =>
      prev.map((rq) =>
        selected.has(noteKey(rq.wrongNote))
          ? { ...rq, wrongNote: { ...rq.wrongNote, isResolved: false } }
          : rq,
      ),
    );
    exitSelectMode();
  };

  const handleBatchDelete = () => {
    showConfirm(
      '삭제 확인',
      `선택한 ${selected.size}개의 오답 기록을 삭제하시겠습니까?`,
      async () => {
        const keys = getSelectedNotes();
        await batchDeleteWrongNotes(keys);
        setAllReviewQuestions((prev) =>
          prev.filter((rq) => !selected.has(noteKey(rq.wrongNote))),
        );
        exitSelectMode();
      },
      '삭제',
    );
  };

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

  const filteredKeys = filteredQuestions.map((rq) => noteKey(rq.wrongNote));
  const allFilteredSelected = filteredKeys.length > 0 && filteredKeys.every((k) => selected.has(k));

  // List mode
  return (
    <>
      <Stack.Screen options={{ title: '오답 노트' }} />
      <View style={styles.container}>
        <View style={styles.contentWrap}>
          {/* Summary stats */}
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
            {unresolvedQuestions.length > 0 && !selectMode && (
              <Pressable
                style={styles.studyAllBtn}
                onPress={() => startStudy(unresolvedQuestions)}
              >
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.studyAllBtnText}>미해결 복습 ({unresolvedQuestions.length})</Text>
              </Pressable>
            )}
          </View>

          {/* Main tabs: 전체 보기 / 유형별 보기 */}
          <View style={styles.mainTabBar}>
            <Pressable
              style={[styles.mainTab, mainTab === 'all' && styles.mainTabActive]}
              onPress={() => { setMainTab('all'); exitSelectMode(); }}
            >
              <Ionicons name="list" size={15} color={mainTab === 'all' ? COLORS.primary : COLORS.textLight} />
              <Text style={[styles.mainTabText, mainTab === 'all' && styles.mainTabTextActive]}>전체 보기</Text>
            </Pressable>
            <Pressable
              style={[styles.mainTab, mainTab === 'analysis' && styles.mainTabActive]}
              onPress={() => { setMainTab('analysis'); exitSelectMode(); }}
            >
              <Ionicons name="analytics" size={15} color={mainTab === 'analysis' ? COLORS.primary : COLORS.textLight} />
              <Text style={[styles.mainTabText, mainTab === 'analysis' && styles.mainTabTextActive]}>유형별 보기</Text>
            </Pressable>
          </View>

          {/* ─── 전체 보기 탭 ─── */}
          {mainTab === 'all' && (
            <>
              {/* Filter + edit */}
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
                {selectMode ? (
                  <View style={styles.filterBarRight}>
                    <Pressable style={styles.selectAllBtn} onPress={toggleSelectAll}>
                      <Ionicons
                        name={allFilteredSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={COLORS.primary}
                      />
                      <Text style={styles.selectAllText}>전체</Text>
                    </Pressable>
                    <Pressable onPress={exitSelectMode}>
                      <Text style={styles.editBtnText}>취소</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.editBtn} onPress={() => setSelectMode(true)}>
                    <Ionicons name="create-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.editBtnText}>편집</Text>
                  </Pressable>
                )}
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
                  filteredQuestions.map((rq) => {
                    const key = noteKey(rq.wrongNote);
                    const isSelected = selected.has(key);
                    return (
                      <Pressable
                        key={key}
                        style={[styles.noteCard, selectMode && isSelected && styles.noteCardSelected]}
                        onPress={selectMode ? () => toggleSelect(key) : () => startSingleStudy(rq)}
                        onLongPress={!selectMode ? () => {
                          setSelectMode(true);
                          setSelected(new Set([key]));
                        } : undefined}
                      >
                        <View style={styles.noteHeader}>
                          <View style={styles.noteLeft}>
                            {selectMode ? (
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={isSelected ? COLORS.primary : COLORS.textLight}
                              />
                            ) : (
                              <View style={[
                                styles.statusDot,
                                { backgroundColor: rq.wrongNote.isResolved ? '#22C55E' : '#EF4444' },
                              ]} />
                            )}
                            <Text style={styles.noteExam}>제{rq.wrongNote.questionNumber}번</Text>
                            <View style={styles.eraBadge}>
                              <Text style={styles.eraBadgeText}>{rq.wrongNote.era}</Text>
                            </View>
                          </View>
                          <View style={styles.noteRight}>
                            <Text style={styles.wrongCountBadge}>
                              {rq.wrongNote.wrongCount}회 오답
                            </Text>
                            {!selectMode && (
                              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                            )}
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
                    );
                  })
                )}
              </ScrollView>

              {/* Selection action bar */}
              {selectMode && selected.size > 0 && (
                <View style={styles.selectionBar}>
                  <Text style={styles.selectionCount}>{selected.size}개 선택</Text>
                  <View style={styles.selectionActions}>
                    <Pressable style={styles.selActionBtn} onPress={handleBatchResolve}>
                      <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      <Text style={[styles.selActionText, { color: '#22C55E' }]}>해결</Text>
                    </Pressable>
                    <Pressable style={styles.selActionBtn} onPress={handleBatchUnresolve}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                      <Text style={[styles.selActionText, { color: '#EF4444' }]}>미해결</Text>
                    </Pressable>
                    <Pressable style={styles.selActionBtn} onPress={handleBatchDelete}>
                      <Ionicons name="trash" size={18} color="#EF4444" />
                      <Text style={[styles.selActionText, { color: '#EF4444' }]}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ─── 유형별 보기 탭 ─── */}
          {mainTab === 'analysis' && (
            <>
              <View style={styles.analysisTabBar}>
                {([
                  { key: 'era' as AnalysisTab, label: '시대별' },
                  { key: 'category' as AnalysisTab, label: '유형별' },
                  { key: 'keyword' as AnalysisTab, label: '키워드별' },
                ]).map((tab) => (
                  <Pressable
                    key={tab.key}
                    style={[styles.analysisTabBtn, analysisTab === tab.key && styles.analysisTabBtnActive]}
                    onPress={() => setAnalysisTab(tab.key)}
                  >
                    <Text style={[styles.analysisTabText, analysisTab === tab.key && styles.analysisTabTextActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <ScrollView style={styles.analysisScroll} contentContainerStyle={styles.analysisContent}>
                {currentAnalysis.length === 0 ? (
                  <View style={styles.filterEmpty}>
                    <Text style={styles.filterEmptyText}>데이터가 없습니다</Text>
                  </View>
                ) : (
                  currentAnalysis.map((bucket) => {
                    const pct = Math.round((bucket.count / allReviewQuestions.length) * 100);
                    return (
                      <Pressable
                        key={bucket.key}
                        style={styles.analysisBucket}
                        onPress={() => startStudy(bucket.questions)}
                      >
                        <View style={styles.bucketHeader}>
                          {bucket.color && <View style={[styles.bucketDot, { backgroundColor: bucket.color }]} />}
                          <Text style={styles.bucketLabel}>{bucket.label}</Text>
                          <Text style={styles.bucketCount}>{bucket.count}문항</Text>
                          <Ionicons name="play-circle" size={18} color={COLORS.primary} style={{ marginLeft: 4 }} />
                        </View>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: bucket.color || COLORS.primary }]} />
                        </View>
                        <Text style={styles.bucketPct}>{pct}%</Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  contentWrap: { flex: 1, maxWidth: 640, width: '100%', alignSelf: 'center' as const },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Summary bar
  summaryBar: { backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  summaryStats: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  studyAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: RADIUS.sm },
  studyAllBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Main tabs
  mainTabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mainTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  mainTabActive: { borderBottomColor: COLORS.primary },
  mainTabText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  mainTabTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Filter bar
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F0FF' },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTabTextActive: { color: '#fff' },
  filterBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 'auto' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectAllText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // List
  listScroll: { flex: 1 },
  listContent: { padding: 16, gap: 10, paddingBottom: 80 },
  filterEmpty: { paddingVertical: 40, alignItems: 'center' },
  filterEmptyText: { fontSize: 14, color: COLORS.textSecondary },

  // Note card
  noteCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm },
  noteCardSelected: { borderWidth: 2, borderColor: COLORS.primary },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  noteLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  noteExam: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eraBadge: { backgroundColor: '#F1F0FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  eraBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  noteRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wrongCountBadge: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  noteContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  noteMetaText: { fontSize: 11, color: COLORS.textLight },

  // Selection bar
  selectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  selectionCount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  selectionActions: { flexDirection: 'row', gap: 12 },
  selActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: RADIUS.sm, backgroundColor: '#F1F0FF' },
  selActionText: { fontSize: 13, fontWeight: '600' },

  // Analysis
  analysisTabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  analysisTabBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F0FF' },
  analysisTabBtnActive: { backgroundColor: COLORS.primary },
  analysisTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  analysisTabTextActive: { color: '#fff' },
  analysisScroll: { flex: 1 },
  analysisContent: { padding: 16, gap: 10, paddingBottom: 40 },
  analysisBucket: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm },
  bucketHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bucketDot: { width: 10, height: 10, borderRadius: 5 },
  bucketLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  bucketCount: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  barBg: { height: 8, backgroundColor: '#F1F0FF', borderRadius: 4, overflow: 'hidden' as const },
  barFill: { height: 8, borderRadius: 4 },
  bucketPct: { fontSize: 11, color: COLORS.textLight, marginTop: 4, textAlign: 'right' as const },

  // Result
  resultContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  resultScore: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginBottom: 12 },
  resultDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  resultActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  primaryBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
