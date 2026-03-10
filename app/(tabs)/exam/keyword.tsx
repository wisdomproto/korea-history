import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, SectionList } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, ERAS } from '@/lib/constants';
import { Question, Era } from '@/lib/types';
import { fetchKeywords, fetchAllQuestions } from '@/lib/examData';
import QuestionCard from '@/components/exam/QuestionCard';

type Step = 'select' | 'study';
type SortMode = 'era' | 'alpha' | 'count';

const SORT_TABS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'era', label: '시대별', icon: 'time-outline' },
  { key: 'alpha', label: '가나다', icon: 'text-outline' },
  { key: 'count', label: '문항수', icon: 'stats-chart-outline' },
];

/** Determine the primary era for a keyword based on its questions */
function getPrimaryEra(questionIds: number[], questionsMap: Map<number, Question>): Era | null {
  const eraCounts: Partial<Record<Era, number>> = {};
  for (const id of questionIds) {
    const q = questionsMap.get(id);
    if (q) {
      eraCounts[q.era] = (eraCounts[q.era] || 0) + 1;
    }
  }
  let maxEra: Era | null = null;
  let maxCount = 0;
  for (const [era, count] of Object.entries(eraCounts)) {
    if (count! > maxCount) {
      maxEra = era as Era;
      maxCount = count!;
    }
  }
  return maxEra;
}

/** Korean alphabetical comparison */
function koreanCompare(a: string, b: string): number {
  return a.localeCompare(b, 'ko');
}

export default function KeywordStudyScreen() {
  const [step, setStep] = useState<Step>('select');
  const [keywordsMap, setKeywordsMap] = useState<Record<string, number[]>>({});
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('era');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // Study state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    Promise.all([fetchKeywords(), fetchAllQuestions()]).then(([kw, q]) => {
      setKeywordsMap(kw);
      setAllQuestions(q);
      setLoading(false);
    });
  }, []);

  // Build a map for quick question lookup
  const questionsMap = useMemo(() => {
    const m = new Map<number, Question>();
    for (const q of allQuestions) m.set(q.id, q);
    return m;
  }, [allQuestions]);

  // Keyword → primary era mapping
  const keywordEraMap = useMemo(() => {
    const m = new Map<string, Era | null>();
    for (const [kw, ids] of Object.entries(keywordsMap)) {
      m.set(kw, getPrimaryEra(ids, questionsMap));
    }
    return m;
  }, [keywordsMap, questionsMap]);

  // Filtered keywords
  const filteredKeywords = useMemo(() => {
    return Object.entries(keywordsMap)
      .filter(([kw]) => !search || kw.includes(search));
  }, [keywordsMap, search]);

  // Grouped/sorted sections for SectionList
  const sections = useMemo(() => {
    if (sortMode === 'era') {
      // Group by era
      const groups: Record<string, [string, number[]][]> = {};
      for (const era of ERAS) {
        groups[era.key] = [];
      }
      groups['기타'] = [];

      for (const entry of filteredKeywords) {
        const era = keywordEraMap.get(entry[0]);
        if (era && groups[era]) {
          groups[era].push(entry);
        } else {
          groups['기타'].push(entry);
        }
      }

      // Sort within each group alphabetically
      const result = ERAS
        .filter((era) => groups[era.key].length > 0)
        .map((era) => ({
          title: era.label,
          color: era.color,
          data: groups[era.key].sort((a, b) => koreanCompare(a[0], b[0])),
        }));

      if (groups['기타'].length > 0) {
        result.push({
          title: '기타',
          color: COLORS.textLight,
          data: groups['기타'].sort((a, b) => koreanCompare(a[0], b[0])),
        });
      }
      return result;
    }

    if (sortMode === 'alpha') {
      // Group by first Korean consonant/letter
      const sorted = [...filteredKeywords].sort((a, b) => koreanCompare(a[0], b[0]));
      // Single flat section
      return [{ title: '가나다순', color: COLORS.primary, data: sorted }];
    }

    // count mode
    const sorted = [...filteredKeywords].sort((a, b) => b[1].length - a[1].length);
    return [{ title: '문항수순', color: '#EC4899', data: sorted }];
  }, [filteredKeywords, sortMode, keywordEraMap]);

  const totalKeywords = filteredKeywords.length;

  const startStudy = (keyword: string) => {
    const ids = keywordsMap[keyword] || [];
    const filtered = allQuestions.filter((q) => ids.includes(q.id));
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    setSelectedKeyword(keyword);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setCompleted(false);
    setStep('study');
  };

  const handleSelect = useCallback(
    (choice: number) => {
      if (showResult) return;
      setSelectedAnswer(choice);
      setShowResult(true);
      if (questions[currentIndex] && choice === questions[currentIndex].correctAnswer) {
        setCorrectCount((c) => c + 1);
      }
    },
    [showResult, questions, currentIndex],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  }, [currentIndex, questions.length]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '키워드별 학습' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
          {/* Search bar */}
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

          {/* Sort tabs */}
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
                  color={sortMode === tab.key ? COLORS.primary : COLORS.textLight}
                />
                <Text style={[styles.sortTabText, sortMode === tab.key && styles.sortTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.countText}>{totalKeywords}개</Text>
          </View>

          {/* Keyword sections */}
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
            renderItem={({ item: [keyword, ids] }) => (
              <Pressable
                style={styles.keywordRow}
                onPress={() => startStudy(keyword)}
              >
                <Text style={styles.keywordText}>{keyword}</Text>
                <View style={styles.keywordRight}>
                  <View style={styles.keywordBadge}>
                    <Text style={styles.keywordBadgeText}>{ids.length}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                </View>
              </Pressable>
            )}
            renderSectionFooter={() => <View style={styles.sectionFooter} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color={COLORS.border} />
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </View>
      </>
    );
  }

  // ─── 완료 화면 ───
  if (completed) {
    const rate = Math.round((correctCount / questions.length) * 100);
    return (
      <>
        <Stack.Screen options={{ title: '학습 완료' }} />
        <View style={styles.resultContainer}>
          <Ionicons
            name={rate >= 80 ? 'trophy' : rate >= 60 ? 'thumbs-up' : 'fitness'}
            size={56}
            color={rate >= 80 ? '#F59E0B' : rate >= 60 ? COLORS.primary : COLORS.danger}
          />
          <Text style={styles.resultTitle}>'{selectedKeyword}' 학습 완료!</Text>
          <Text style={styles.resultScore}>
            {questions.length}문항 중 {correctCount}문항 정답 ({rate}%)
          </Text>
          <Text style={styles.resultDesc}>
            {rate >= 80
              ? '훌륭합니다! 이 키워드를 잘 이해하고 있어요.'
              : rate >= 60
                ? '좋은 성적입니다. 조금만 더 복습하세요!'
                : '더 학습이 필요합니다. 다시 도전해보세요!'}
          </Text>
          <View style={styles.resultActions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => { setStep('select'); setCompleted(false); }}
            >
              <Text style={styles.actionBtnText}>다른 키워드</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.primaryActionBtn]}
              onPress={() => startStudy(selectedKeyword!)}
            >
              <Text style={styles.primaryActionText}>다시 학습</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  // ─── 문제풀이 화면 ───
  const current = questions[currentIndex];
  if (!current) return null;

  return (
    <>
      <Stack.Screen options={{ title: `'${selectedKeyword}' 학습` }} />
      <View style={styles.studyContainer}>
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {questions.length}
          </Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / questions.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <QuestionCard
            question={current}
            questionIndex={currentIndex}
            totalQuestions={questions.length}
          />

          <View style={styles.choicesSection}>
            {current.choices.map((choice, idx) => {
              const num = idx + 1;
              const isCorrect = num === current.correctAnswer;
              const isSelected = num === selectedAnswer;
              const isWrong = showResult && isSelected && !isCorrect;

              return (
                <Pressable
                  key={num}
                  style={[
                    styles.choiceItem,
                    showResult && isCorrect && styles.correctChoice,
                    isWrong && styles.wrongChoice,
                    !showResult && isSelected && styles.selectedChoice,
                  ]}
                  onPress={() => handleSelect(num)}
                  disabled={showResult}
                >
                  <Text
                    style={[
                      styles.choiceNum,
                      showResult && isCorrect && styles.correctText,
                      isWrong && styles.wrongText,
                    ]}
                  >
                    {showResult && isCorrect ? '✓' : showResult && isWrong ? '✗' : `${num}`}
                  </Text>
                  <Text
                    style={[
                      styles.choiceText,
                      showResult && isCorrect && styles.correctText,
                      isWrong && styles.wrongText,
                    ]}
                  >
                    {choice}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {showResult && (
            <View
              style={[
                styles.feedbackBox,
                selectedAnswer === current.correctAnswer
                  ? styles.correctFeedback
                  : styles.wrongFeedback,
              ]}
            >
              <Text style={styles.feedbackText}>
                {selectedAnswer === current.correctAnswer
                  ? '✅ 정답!'
                  : `❌ 오답! 정답은 ${current.correctAnswer}번입니다.`}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          {showResult ? (
            <Pressable style={styles.nextStudyBtn} onPress={handleNext}>
              <Text style={styles.nextStudyBtnText}>
                {currentIndex < questions.length - 1 ? '다음 문항 ▶' : '결과 보기'}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.hintText}>선지를 선택하면 즉시 정답이 확인됩니다</Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16, paddingBottom: 0 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  // Sort tabs
  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12,
  },
  sortTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sortTabActive: {
    backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary,
  },
  sortTabText: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
  sortTabTextActive: { color: COLORS.primary, fontWeight: '600' },
  countText: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 'auto' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 2,
  },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textSecondary },
  sectionFooter: { height: 8 },

  // Keyword rows (list style instead of scattered chips)
  keywordRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  keywordText: { fontSize: 14, fontWeight: '500', color: COLORS.text, flex: 1 },
  keywordRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keywordBadge: {
    backgroundColor: COLORS.primaryLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  keywordBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  listContent: { paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  // Study
  studyContainer: { flex: 1, backgroundColor: COLORS.background },
  progressBar: { padding: 16, paddingBottom: 8 },
  progressText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '500' },
  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#EC4899' },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },

  choicesSection: { gap: 8 },
  choiceItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: COLORS.border,
  },
  selectedChoice: { borderColor: COLORS.primary, backgroundColor: '#F0F7FF' },
  correctChoice: { borderColor: COLORS.success, backgroundColor: '#F1F8F1' },
  wrongChoice: { borderColor: COLORS.danger, backgroundColor: '#FFF5F5' },
  choiceNum: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center', marginRight: 10 },
  choiceText: { fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 },
  correctText: { color: COLORS.success, fontWeight: '600' },
  wrongText: { color: COLORS.danger },

  feedbackBox: { marginTop: 16, padding: 14, borderRadius: 10 },
  correctFeedback: { backgroundColor: '#E8F5E9' },
  wrongFeedback: { backgroundColor: '#FFEBEE' },
  feedbackText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },

  bottomBar: {
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
  },
  nextStudyBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#EC4899',
  },
  nextStudyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hintText: { fontSize: 13, color: COLORS.textLight },

  // Result
  resultContainer: {
    flex: 1, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  resultTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  resultScore: { fontSize: 18, fontWeight: '600', color: '#EC4899', marginBottom: 12 },
  resultDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  resultActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  primaryActionBtn: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  primaryActionText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
