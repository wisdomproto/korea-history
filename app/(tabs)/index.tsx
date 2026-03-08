import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, TextInput, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '@/components/Container';
import { COLORS, ERAS, SHADOWS, RADIUS } from '@/lib/constants';
import { UserProfile, StudyPlan } from '@/lib/types';
import {
  getUserProfile,
  getStudyPlan,
  getExamRecords,
  ExamRecord,
  getDailyStudyLog,
  DailyStudyLog,
  getWrongNotes,
} from '@/lib/storage';

function getDday(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const AUTHOR_TOOL_PW = '8054';

function getAuthorToolUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_AUTHOR_TOOL_URL;
  if (envUrl) return envUrl;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/admin`;
  }
  return 'http://localhost:3001/admin';
}

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyStudyLog | null>(null);
  const [unresolvedWrong, setUnresolvedWrong] = useState(0);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwInput, setPwInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then(setProfile);
      getStudyPlan().then(setPlan);
      getExamRecords().then(setRecords);
      getDailyStudyLog().then(setDailyLog);
      getWrongNotes().then((notes) => {
        setUnresolvedWrong(notes.filter((n) => !n.isResolved).length);
      });
    }, []),
  );

  const dday = profile?.examDate ? getDday(profile.examDate) : null;
  const currentWeek = plan
    ? plan.weeklyPlan.findIndex((w) => !w.completed) + 1 || plan.totalWeeks
    : null;
  const currentWeekPlan = plan?.weeklyPlan.find((w) => !w.completed);
  const avgScore =
    records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length)
      : null;

  const handlePwSubmit = () => {
    if (pwInput === AUTHOR_TOOL_PW) {
      setShowPwModal(false);
      setPwInput('');
      const url = getAuthorToolUrl();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url);
      }
    } else {
      setPwInput('');
      Alert.alert('오류', '비밀번호가 틀렸습니다.');
    }
  };

  const pwModal = (
    <Modal
      visible={showPwModal}
      transparent
      animationType="fade"
      onRequestClose={() => { setShowPwModal(false); setPwInput(''); }}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => { setShowPwModal(false); setPwInput(''); }}
      >
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>관리자 인증</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="비밀번호 입력"
            placeholderTextColor={COLORS.textLight}
            secureTextEntry
            value={pwInput}
            onChangeText={setPwInput}
            onSubmitEditing={handlePwSubmit}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => { setShowPwModal(false); setPwInput(''); }}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </Pressable>
            <Pressable style={styles.modalConfirmBtn} onPress={handlePwSubmit}>
              <Text style={styles.modalConfirmText}>확인</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const headerRow = (
    <View style={styles.headerRow}>
      <Text style={styles.headerTitle}>한국사 마스터</Text>
      <Pressable
        style={styles.adminBtn}
        onPress={() => setShowPwModal(true)}
        hitSlop={8}
      >
        <Ionicons name="construct-outline" size={18} color={COLORS.textLight} />
      </Pressable>
    </View>
  );

  // 온보딩 미완료 상태
  if (!profile?.onboardingCompleted) {
    return (
      <Container>
        {headerRow}
        {pwModal}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIconWrap}>
            <Ionicons name="school" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.welcomeTitle}>한국사 마스터에{'\n'}오신 것을 환영합니다!</Text>
          <Text style={styles.welcomeDesc}>
            목표 급수와 시험일을 설정하면{'\n'}맞춤형 학습 플랜을 만들어 드려요
          </Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/onboarding/step1')}
          >
            <Text style={styles.ctaButtonText}>학습 플랜 만들기</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>

        <Pressable
          style={styles.quickStartCard}
          onPress={() => router.push('/(tabs)/study')}
        >
          <Ionicons name="flash" size={22} color={COLORS.secondary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.quickStartTitle}>바로 학습 시작</Text>
            <Text style={styles.quickStartDesc}>
              설정 없이 바로 모의고사를 풀어볼 수 있어요
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </Pressable>
      </Container>
    );
  }

  return (
    <Container scroll>
      {headerRow}
      {pwModal}
      {/* D-day 카드 */}
      <View style={styles.ddayCard}>
        <View style={styles.ddayRow}>
          <View>
            <Text style={styles.ddayLabel}>{profile.goalGrade} 목표</Text>
            <Text style={styles.ddayNumber}>
              {dday !== null && dday > 0
                ? `D-${dday}`
                : dday === 0
                  ? 'D-Day!'
                  : '시험 완료'}
            </Text>
          </View>
          <View style={styles.ddayInfo}>
            <Text style={styles.ddayDate}>{profile.examDate}</Text>
            <Text style={styles.ddayStudy}>매일 {profile.dailyStudyMinutes}분</Text>
          </View>
        </View>
        {dday !== null && dday > 0 && (
          <View style={styles.ddayProgress}>
            <View
              style={[
                styles.ddayProgressBar,
                {
                  width: `${Math.min(
                    100,
                    Math.max(
                      5,
                      ((plan?.totalWeeks ?? 1) * 7 - dday) /
                        ((plan?.totalWeeks ?? 1) * 7) *
                        100,
                    ),
                  )}%`,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* 오늘의 학습 */}
      {profile?.onboardingCompleted && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="today" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>오늘의 학습</Text>
          </View>
          {dailyLog?.completed ? (
            <View style={styles.dailyComplete}>
              <View style={styles.completeCircle}>
                <Ionicons name="checkmark" size={28} color={COLORS.success} />
              </View>
              <Text style={styles.dailyCompleteText}>오늘 학습 완료!</Text>
              <Text style={styles.dailyCompleteDesc}>
                {dailyLog.questionsStudied}문제 · {dailyLog.minutesSpent}분 학습
              </Text>
            </View>
          ) : (
            <View>
              <View style={styles.dailyRow}>
                <View style={styles.dailyItem}>
                  <Text style={styles.dailyNumber}>
                    {Math.max(
                      0,
                      Math.round((profile.dailyStudyMinutes ?? 30) / 2) -
                        (dailyLog?.questionsStudied ?? 0),
                    )}
                  </Text>
                  <Text style={styles.dailyLabel}>추천 문제</Text>
                </View>
                <View style={styles.dailyDivider} />
                <View style={styles.dailyItem}>
                  <Text style={styles.dailyNumber}>
                    ~{Math.max(5, (profile.dailyStudyMinutes ?? 30) - (dailyLog?.minutesSpent ?? 0))}분
                  </Text>
                  <Text style={styles.dailyLabel}>예상 소요</Text>
                </View>
                {unresolvedWrong > 0 && (
                  <>
                    <View style={styles.dailyDivider} />
                    <View style={styles.dailyItem}>
                      <Text style={[styles.dailyNumber, { color: COLORS.secondary }]}>
                        {unresolvedWrong}
                      </Text>
                      <Text style={styles.dailyLabel}>오답 복습</Text>
                    </View>
                  </>
                )}
              </View>
              <Pressable
                style={styles.studyButton}
                onPress={() => router.push('/(tabs)/study')}
              >
                <Text style={styles.studyButtonText}>학습 시작하기</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* 이번 주 학습 */}
      {currentWeekPlan && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>이번 주 학습</Text>
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>{currentWeek}주차</Text>
            </View>
          </View>
          {currentWeekPlan.focusEras.length > 0 &&
            currentWeekPlan.focusEras.length <= 4 && (
              <View style={styles.eraTags}>
                {currentWeekPlan.focusEras.map((era) => {
                  const eraConfig = ERAS.find((e) => e.key === era);
                  return (
                    <View
                      key={era}
                      style={[
                        styles.eraTag,
                        { backgroundColor: (eraConfig?.color || '#888') + '15' },
                      ]}
                    >
                      <Text
                        style={[styles.eraTagText, { color: eraConfig?.color || '#888' }]}
                      >
                        {eraConfig?.label || era}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          {currentWeekPlan.goals.map((goal, idx) => (
            <View key={idx} style={styles.goalRow}>
              <Ionicons name="ellipse-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.goalText}>{goal}</Text>
            </View>
          ))}
          <Pressable
            style={styles.studyButton}
            onPress={() => router.push('/(tabs)/study')}
          >
            <Text style={styles.studyButtonText}>학습하러 가기</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </Pressable>
        </View>
      )}

      {/* 나의 실력 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
          <Text style={styles.cardTitle}>나의 실력</Text>
        </View>
        {records.length > 0 ? (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{records.length}</Text>
              <Text style={styles.statLabel}>응시 횟수</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{avgScore}점</Text>
              <Text style={styles.statLabel}>평균 점수</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {records[records.length - 1]?.grade || '-'}
              </Text>
              <Text style={styles.statLabel}>최근 급수</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={32} color={COLORS.border} />
            <Text style={styles.emptyText}>모의고사를 풀면 실력 분석이 표시됩니다</Text>
          </View>
        )}
      </View>

      {/* 빠른 시작 */}
      <View style={styles.quickActions}>
        {([
          { icon: 'document-text' as const, label: '모의고사', path: '/exam/select' },
          { icon: 'analytics' as const, label: '진단 테스트', path: '/exam/diagnostic' },
          { icon: 'refresh' as const, label: '오답 복습', path: '/exam/review' },
        ] as const).map((action) => (
          <Pressable
            key={action.label}
            style={styles.actionCard}
            onPress={() => router.push(action.path as any)}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name={action.icon} size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  // --- 헤더 ---
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  adminBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // --- 비밀번호 모달 ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 24,
    width: 300,
    ...SHADOWS.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // --- 온보딩 미완료 ---
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  welcomeIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  welcomeDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  quickStartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickStartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  quickStartDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // --- D-day ---
  ddayCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: 22,
    ...SHADOWS.md,
  },
  ddayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ddayLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  ddayNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  ddayInfo: {
    alignItems: 'flex-end',
  },
  ddayDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  ddayStudy: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  ddayProgress: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    marginTop: 18,
    overflow: 'hidden',
  },
  ddayProgressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  // --- 카드 공통 ---
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  weekBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  weekBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  eraTags: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  eraTag: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eraTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  goalText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  studyButton: {
    marginTop: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  studyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // --- 통계 ---
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // --- 빠른 시작 ---
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.sm,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  // --- 오늘의 학습 ---
  dailyComplete: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  completeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dailyCompleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  dailyCompleteDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyItem: {
    flex: 1,
    alignItems: 'center',
  },
  dailyNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  dailyLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dailyDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
});
