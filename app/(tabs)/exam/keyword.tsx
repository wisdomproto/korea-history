import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, ActivityIndicator, SectionList } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, ERAS } from '@/lib/constants';
import { Question, Era } from '@/lib/types';
import { fetchKeywords, fetchAllQuestions } from '@/lib/examData';
import { useStudyState } from '@/hooks/useStudyState';
import StudyView from '@/components/exam/StudyView';

type Step = 'select' | 'study';
type SortMode = 'era' | 'alpha' | 'count';

const SORT_TABS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'era', label: '시대별', icon: 'time-outline' },
  { key: 'alpha', label: '가나다', icon: 'text-outline' },
  { key: 'count', label: '문항수', icon: 'stats-chart-outline' },
];

const ERA_COLORS: Record<string, string> = {
  '선사·고조선': '#8B5CF6',
  '삼국': '#3B82F6',
  '남북국': '#06B6D4',
  '고려': '#10B981',
  '조선 전기': '#F59E0B',
  '조선 후기': '#F97316',
  '근대': '#EF4444',
  '현대': '#EC4899',
};

/** Determine the primary era for a keyword based on its questions */
function getPrimaryEra(questionIds: number[], questionsMap: Map<number, Question>): Era | null {
  const eraCounts: Partial<Record<Era, number>> = {};
  for (const id of questionIds) {
    const q = questionsMap.get(id);
    if (q) eraCounts[q.era] = (eraCounts[q.era] || 0) + 1;
  }
  let maxEra: Era | null = null;
  let maxCount = 0;
  for (const [era, count] of Object.entries(eraCounts)) {
    if (count! > maxCount) { maxEra = era as Era; maxCount = count!; }
  }
  return maxEra;
}

function koreanCompare(a: string, b: string): number {
  return a.localeCompare(b, 'ko');
}

export default function KeywordStudyScreen() {
  const [step, setStep] = useState<Step>('select');
  const [keywordsMap, setKeywordsMap] = useState<Record<string, number[]>>({});
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('count');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const study = useStudyState();

  useEffect(() => {
    Promise.all([fetchKeywords(), fetchAllQuestions()]).then(([kw, q]) => {
      setKeywordsMap(kw);
      setAllQuestions(q);
      setLoading(false);
    });
  }, []);

  const questionsMap = useMemo(() => {
    const m = new Map<number, Question>();
    for (const q of allQuestions) m.set(q.id, q);
    return m;
  }, [allQuestions]);

  const keywordEraMap = useMemo(() => {
    const m = new Map<string, Era | null>();
    for (const [kw, ids] of Object.entries(keywordsMap)) {
      m.set(kw, getPrimaryEra(ids, questionsMap));
    }
    return m;
  }, [keywordsMap, questionsMap]);

  const filteredKeywords = useMemo(() => {
    return Object.entries(keywordsMap)
      .filter(([kw]) => !search || kw.includes(search));
  }, [keywordsMap, search]);

  const sections = useMemo(() => {
    if (sortMode === 'era') {
      const groups: Record<string, [string, number[]][]> = {};
      for (const era of ERAS) groups[era.key] = [];
      groups['기타'] = [];
      for (const entry of filteredKeywords) {
        const era = keywordEraMap.get(entry[0]);
        if (era && groups[era]) groups[era].push(entry);
        else groups['기타'].push(entry);
      }
      const result = ERAS
        .filter((era) => groups[era.key].length > 0)
        .map((era) => ({
          title: era.label,
          color: era.color,
          data: groups[era.key].sort((a, b) => koreanCompare(a[0], b[0])),
        }));
      if (groups['기타'].length > 0) {
        result.push({ title: '기타', color: COLORS.textLight, data: groups['기타'].sort((a, b) => koreanCompare(a[0], b[0])) });
      }
      return result;
    }
    if (sortMode === 'alpha') {
      const sorted = [...filteredKeywords].sort((a, b) => koreanCompare(a[0], b[0]));
      return [{ title: '가나다순', color: COLORS.primary, data: sorted }];
    }
    const sorted = [...filteredKeywords].sort((a, b) => b[1].length - a[1].length);
    return [{ title: '문항수순', color: '#EC4899', data: sorted }];
  }, [filteredKeywords, sortMode, keywordEraMap]);

  const totalKeywords = filteredKeywords.length;

  const startStudy = (keyword: string) => {
    const ids = keywordsMap[keyword] || [];
    const filtered = allQuestions.filter((q) => ids.includes(q.id));
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    setSelectedKeyword(keyword);
    study.startStudy(shuffled);
    setStep('study');
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '키워드별 학습' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>키워드 불러오는 중...</Text>
        </View>
      </>
    );
  }

  // ─── 키워드 선택 화면 ───
  if (step === 'select') {
    return (
      <>
        <Stack.Screen options={{ title: '키워드별 학습' }} />
        <View style={styles.container}>
          <View style={styles.wrap}>
            {/* 검색바 */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={COLORS.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="키워드 검색..."
                placeholderTextColor={COLORS.textLight}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                </Pressable>
              )}
            </View>

            {/* 정렬 탭 */}
            <View style={styles.sortRow}>
              {SORT_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.sortTab, sortMode === tab.key && styles.sortTabActive]}
                  onPress={() => setSortMode(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={sortMode === tab.key ? '#fff' : COLORS.textLight}
                  />
                  <Text style={[styles.sortTabText, sortMode === tab.key && styles.sortTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.countText}>{totalKeywords}개</Text>
            </View>

            {/* 키워드 리스트 */}
            <SectionList
              sections={sections}
              keyExtractor={([keyword]) => keyword}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.data.length}개</Text>
                </View>
              )}
              renderItem={({ item: [keyword, ids] }) => {
                const era = keywordEraMap.get(keyword);
                const eraColor = era ? (ERA_COLORS[era] || COLORS.textLight) : COLORS.textLight;
                return (
                  <Pressable style={styles.keywordRow} onPress={() => startStudy(keyword)}>
                    <View style={styles.keywordLeft}>
                      <Text style={styles.keywordText}>{keyword}</Text>
                      {era && (
                        <Text style={[styles.eraTag, { color: eraColor }]}>
                          {era}
                        </Text>
                      )}
                    </View>
                    <View style={styles.keywordRight}>
                      <View style={styles.keywordBadge}>
                        <Text style={styles.keywordBadgeText}>{ids.length}문항</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                    </View>
                  </Pressable>
                );
              }}
              renderSectionFooter={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={40} color={COLORS.border} />
                  <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
            />
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
          <View style={styles.resultWrap}>
            <View style={styles.resultIconWrap}>
              <Ionicons
                name={rate >= 80 ? 'trophy' : rate >= 60 ? 'thumbs-up' : 'fitness'}
                size={48}
                color={rate >= 80 ? '#F59E0B' : rate >= 60 ? COLORS.primary : COLORS.danger}
              />
            </View>
            <Text style={styles.resultKeyword}>'{selectedKeyword}'</Text>
            <Text style={styles.resultTitle}>학습 완료!</Text>

            <View style={styles.resultCard}>
              <View style={styles.resultStat}>
                <Text style={styles.resultStatNum}>{study.questions.length}</Text>
                <Text style={styles.resultStatLabel}>총 문항</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatNum, { color: COLORS.primary }]}>{study.correctCount}</Text>
                <Text style={styles.resultStatLabel}>정답</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatNum, { color: '#EC4899' }]}>{rate}%</Text>
                <Text style={styles.resultStatLabel}>정답률</Text>
              </View>
            </View>

            <Text style={styles.resultDesc}>
              {rate >= 80
                ? '훌륭합니다! 이 키워드를 잘 이해하고 있어요 🎉'
                : rate >= 60
                  ? '좋은 성적입니다! 조금만 더 복습하세요 💪'
                  : '더 학습이 필요합니다. 다시 도전해보세요! 📚'}
            </Text>

            <View style={styles.resultActions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => { setStep('select'); }}
              >
                <Ionicons name="list" size={18} color={COLORS.text} />
                <Text style={styles.actionBtnText}>다른 키워드</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.primaryActionBtn]}
                onPress={() => startStudy(selectedKeyword!)}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.primaryActionText}>다시 학습</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </>
    );
  }

  // ─── 문제풀이 화면 ───
  if (!study.current) return null;

  return (
    <>
      <Stack.Screen options={{ title: `'${selectedKeyword}' 학습` }} />
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
        progressRight={
          <Text style={styles.progressCorrect}>✓ {study.correctCount}</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  container: { flex: 1, backgroundColor: COLORS.background },
  wrap: { flex: 1, maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingBottom: 0 },

  // 검색바
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12, ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0 },

  // 정렬 탭
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sortTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortTabText: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
  sortTabTextActive: { color: '#fff', fontWeight: '600' },
  countText: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 'auto', fontWeight: '500' },

  // 섹션 헤더
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 2,
  },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textSecondary },

  // 키워드 행
  keywordRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  keywordLeft: { flex: 1, gap: 3 },
  keywordText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  eraTag: { fontSize: 11, fontWeight: '500' },
  keywordRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keywordBadge: {
    backgroundColor: COLORS.primaryLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  keywordBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  listContent: { paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  // 진행바 우측 정답수
  progressCorrect: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // 결과
  resultContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  resultWrap: {
    maxWidth: 640, width: '100%', alignSelf: 'center',
    alignItems: 'center', padding: 24,
  },
  resultIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  resultKeyword: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 20 },

  resultCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 20, width: '100%',
    justifyContent: 'space-around', borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 16, ...SHADOWS.sm,
  },
  resultStat: { alignItems: 'center', gap: 4 },
  resultStatNum: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  resultStatLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  resultDivider: { width: 1, backgroundColor: COLORS.border },

  resultDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  resultActions: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  primaryActionBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  primaryActionText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
