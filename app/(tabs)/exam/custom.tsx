import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ERAS, CATEGORIES, RADIUS, SHADOWS } from '@/lib/constants';
import { Era, Category, Question } from '@/lib/types';
import { fetchAllQuestions } from '@/lib/examData';
import { useStudyState } from '@/hooks/useStudyState';
import StudyView from '@/components/exam/StudyView';

type ViewMode = 'byEra' | 'byCategory';
type Step = 'select' | 'study';

// Composite key for leaf node: "era::category"
function leafKey(era: Era, cat: Category) { return `${era}::${cat}`; }
function parseLeaf(key: string): { era: Era; category: Category } {
  const [era, category] = key.split('::');
  return { era: era as Era, category: category as Category };
}

export default function CustomStudyScreen() {
  const [step, setStep] = useState<Step>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('byEra');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded parent nodes
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Selected leaf nodes (era::category)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const study = useStudyState();

  useEffect(() => {
    fetchAllQuestions().then((q) => {
      setAllQuestions(q);
      setLoading(false);
    });
  }, []);

  // Build count map: { "era::category": count }
  const leafCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allQuestions.forEach((q) => {
      const k = leafKey(q.era, q.category);
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [allQuestions]);

  // Get children keys for a parent
  const getChildren = useCallback((parentKey: string): string[] => {
    if (viewMode === 'byEra') {
      return CATEGORIES.map((c) => leafKey(parentKey as Era, c.key))
        .filter((k) => (leafCounts[k] || 0) > 0);
    }
    return ERAS.map((e) => leafKey(e.key, parentKey as Category))
      .filter((k) => (leafCounts[k] || 0) > 0);
  }, [viewMode, leafCounts]);

  // Parent count
  const getParentCount = useCallback((parentKey: string): number => {
    return getChildren(parentKey).reduce((sum, k) => sum + (leafCounts[k] || 0), 0);
  }, [getChildren, leafCounts]);

  // Toggle expand
  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toggle parent (select/deselect all children)
  const toggleParent = (parentKey: string) => {
    const children = getChildren(parentKey);
    const allSelected = children.every((c) => selected.has(c));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        children.forEach((c) => next.delete(c));
      } else {
        children.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  // Toggle leaf
  const toggleLeaf = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Select all / clear
  const selectAll = () => {
    const all = new Set<string>();
    Object.keys(leafCounts).forEach((k) => all.add(k));
    setSelected(all);
  };
  const clearAll = () => setSelected(new Set());

  // Selected question count
  const selectedCount = useMemo(() => {
    return Array.from(selected).reduce((sum, k) => sum + (leafCounts[k] || 0), 0);
  }, [selected, leafCounts]);

  // Switch mode (preserve selections)
  const switchMode = (mode: ViewMode) => {
    setViewMode(mode);
    setExpanded(new Set());
  };

  // Start study
  const startStudy = () => {
    const selectedLeaves = Array.from(selected).map(parseLeaf);
    const filtered = allQuestions.filter((q) =>
      selectedLeaves.some((l) => l.era === q.era && l.category === q.category),
    );
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    study.startStudy(shuffled);
    setStep('study');
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '맞춤형 학습' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </>
    );
  }

  // ─── 선택 화면 (트리) ───
  if (step === 'select') {
    const parents = viewMode === 'byEra'
      ? ERAS.map((e) => ({ key: e.key, label: e.label, color: e.color }))
      : CATEGORIES.map((c) => ({ key: c.key, label: c.label, color: undefined }));

    const categoryColors: Record<string, string> = {
      '정치': '#6366F1', '경제': '#F59E0B', '사회': '#10B981', '문화': '#8B5CF6',
    };

    return (
      <>
        <Stack.Screen options={{ title: '맞춤형 학습' }} />
        <View style={styles.container}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeBtn, viewMode === 'byEra' && styles.modeBtnActive]}
              onPress={() => switchMode('byEra')}
            >
              <Ionicons name="time" size={16} color={viewMode === 'byEra' ? '#fff' : COLORS.textSecondary} />
              <Text style={[styles.modeBtnText, viewMode === 'byEra' && styles.modeBtnTextActive]}>
                시대별
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, viewMode === 'byCategory' && styles.modeBtnActive]}
              onPress={() => switchMode('byCategory')}
            >
              <Ionicons name="grid" size={16} color={viewMode === 'byCategory' ? '#fff' : COLORS.textSecondary} />
              <Text style={[styles.modeBtnText, viewMode === 'byCategory' && styles.modeBtnTextActive]}>
                유형별
              </Text>
            </Pressable>
          </View>

          {/* Quick actions */}
          <View style={styles.quickRow}>
            <Pressable style={styles.quickBtn} onPress={selectAll}>
              <Text style={styles.quickBtnText}>전체 선택</Text>
            </Pressable>
            <Pressable style={styles.quickBtn} onPress={clearAll}>
              <Text style={styles.quickBtnText}>선택 해제</Text>
            </Pressable>
            <Text style={styles.selectedInfo}>{selectedCount}문항 선택</Text>
          </View>

          {/* Tree */}
          <ScrollView contentContainerStyle={styles.treeContent}>
            {parents.map((parent) => {
              const parentCount = getParentCount(parent.key);
              if (parentCount === 0) return null;

              const children = getChildren(parent.key);
              const isExpanded = expanded.has(parent.key);
              const allChildrenSelected = children.length > 0 && children.every((c) => selected.has(c));
              const someChildrenSelected = children.some((c) => selected.has(c));

              return (
                <View key={parent.key} style={styles.treeNode}>
                  {/* Parent row */}
                  <Pressable style={styles.parentRow} onPress={() => toggleExpand(parent.key)}>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); toggleParent(parent.key); }}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={allChildrenSelected ? 'checkbox' : someChildrenSelected ? 'remove-circle' : 'square-outline'}
                        size={22}
                        color={allChildrenSelected || someChildrenSelected ? COLORS.primary : COLORS.textLight}
                      />
                    </Pressable>

                    {parent.color && (
                      <View style={[styles.colorDot, { backgroundColor: parent.color }]} />
                    )}
                    {!parent.color && (
                      <View style={[styles.colorDot, { backgroundColor: categoryColors[parent.key] || '#888' }]} />
                    )}

                    <Text style={styles.parentLabel}>{parent.label}</Text>
                    <Text style={styles.parentCount}>{parentCount}</Text>

                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={COLORS.textLight}
                    />
                  </Pressable>

                  {/* Children */}
                  {isExpanded && (
                    <View style={styles.childrenWrap}>
                      {children.map((childKey) => {
                        const parsed = parseLeaf(childKey);
                        const childLabel = viewMode === 'byEra'
                          ? CATEGORIES.find((c) => c.key === parsed.category)?.label || parsed.category
                          : ERAS.find((e) => e.key === parsed.era)?.label || parsed.era;
                        const childColor = viewMode === 'byEra'
                          ? categoryColors[parsed.category] || '#888'
                          : ERAS.find((e) => e.key === parsed.era)?.color || '#888';
                        const count = leafCounts[childKey] || 0;
                        const isLeafSelected = selected.has(childKey);

                        return (
                          <Pressable
                            key={childKey}
                            style={[styles.childRow, isLeafSelected && styles.childRowActive]}
                            onPress={() => toggleLeaf(childKey)}
                          >
                            <Ionicons
                              name={isLeafSelected ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={isLeafSelected ? COLORS.primary : COLORS.textLight}
                            />
                            <View style={[styles.childDot, { backgroundColor: childColor }]} />
                            <Text style={styles.childLabel}>{childLabel}</Text>
                            <Text style={styles.childCount}>{count}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Bottom start button */}
          <View style={styles.bottomAction}>
            <Pressable
              style={[styles.startBtn, selectedCount === 0 && styles.disabledBtn]}
              disabled={selectedCount === 0}
              onPress={startStudy}
            >
              <Ionicons name="play" size={18} color={selectedCount === 0 ? COLORS.textLight : '#fff'} />
              <Text style={[styles.startBtnText, selectedCount === 0 && styles.disabledBtnText]}>
                {selectedCount}문제 학습 시작
              </Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  // ─── 완료 화면 ───
  if (study.completed) {
    const rate = Math.round((study.correctCount / study.questions.length) * 100);
    return (
      <>
        <Stack.Screen options={{ title: '학습 완료' }} />
        <View style={styles.resultContainer}>
          <Ionicons
            name={rate >= 80 ? 'trophy' : rate >= 60 ? 'thumbs-up' : 'fitness'}
            size={56}
            color={rate >= 80 ? '#F59E0B' : rate >= 60 ? COLORS.primary : COLORS.danger}
          />
          <Text style={styles.resultTitle}>맞춤형 학습 완료!</Text>
          <Text style={styles.resultScore}>
            {study.questions.length}문항 중 {study.correctCount}문항 정답 ({rate}%)
          </Text>
          <Text style={styles.resultDesc}>
            {rate >= 80
              ? '훌륭합니다! 선택한 영역을 잘 이해하고 있어요.'
              : rate >= 60
                ? '좋은 성적입니다. 조금만 더 복습하면 완벽해질 거예요!'
                : '더 학습이 필요합니다. 다시 도전해보세요!'}
          </Text>
          <View style={styles.resultActions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => { setStep('select'); }}
            >
              <Text style={styles.actionBtnText}>다시 설정</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.primaryActionBtn]} onPress={startStudy}>
              <Text style={styles.primaryActionText}>같은 조건 재학습</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  // ─── 문제풀이 ───
  if (!study.current) return null;

  return (
    <>
      <Stack.Screen options={{ title: '맞춤형 학습' }} />
      <StudyView
        current={study.current}
        currentIndex={study.currentIndex}
        totalQuestions={study.questions.length}
        selectedAnswer={study.selectedAnswer}
        showResult={study.showResult}
        onSelect={study.handleSelect}
        onNext={study.handleNext}
        isLastQuestion={study.currentIndex >= study.questions.length - 1}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row', gap: 0, margin: 16, marginBottom: 0,
    backgroundColor: COLORS.border, borderRadius: RADIUS.md, padding: 3,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm,
  },
  modeBtnActive: { backgroundColor: COLORS.primary, ...SHADOWS.sm },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modeBtnTextActive: { color: '#fff' },

  // Quick actions
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.sm, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  quickBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  selectedInfo: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.primary, textAlign: 'right' },

  // Tree
  treeContent: { paddingHorizontal: 16, paddingBottom: 100 },
  treeNode: { marginBottom: 4 },
  parentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 14, ...SHADOWS.sm,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  parentLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  parentCount: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginRight: 4 },

  childrenWrap: { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: COLORS.border, paddingLeft: 12, marginTop: 2, marginBottom: 4 },
  childRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: RADIUS.sm, marginBottom: 2,
  },
  childRowActive: { backgroundColor: COLORS.primaryLight },
  childDot: { width: 8, height: 8, borderRadius: 4 },
  childLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  childCount: { fontSize: 12, color: COLORS.textSecondary },

  // Bottom
  bottomAction: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    padding: 16,
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 15,
  },
  startBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  disabledBtn: { backgroundColor: COLORS.border },
  disabledBtnText: { color: COLORS.textLight },

  // Result
  resultContainer: {
    flex: 1, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  resultTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  resultScore: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginBottom: 12 },
  resultDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  resultActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  primaryActionBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  primaryActionText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
