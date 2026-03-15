import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { showConfirm } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '@/components/Container';
import { COLORS, SHADOWS, RADIUS } from '@/lib/constants';
import { UserProfile } from '@/lib/types';
import { getUserProfile, getExamRecords, ExamRecord } from '@/lib/storage';

function getDday(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MyPageScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<ExamRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then(setProfile);
      getExamRecords().then(setRecords);
    }, []),
  );

  const dday = profile?.examDate ? getDday(profile.examDate) : null;

  const handleResetOnboarding = () => {
    showConfirm(
      '학습 설정 초기화',
      '온보딩 설정을 초기화하고 다시 설정하시겠습니까?\n(학습 기록은 유지됩니다)',
      async () => {
        await AsyncStorage.removeItem('@user_profile');
        await AsyncStorage.removeItem('@study_plan');
        setProfile(null);
        router.push('/onboarding/step1');
      },
      '초기화',
    );
  };

  return (
    <Container scroll>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons
            name={profile?.onboardingCompleted ? 'school' : 'person'}
            size={28}
            color={COLORS.primary}
          />
        </View>
        {profile?.onboardingCompleted ? (
          <View style={styles.profileInfo}>
            <Text style={styles.profileGoal}>목표: {profile.goalGrade}</Text>
            <Text style={styles.profileMeta}>
              {dday !== null && dday > 0 ? `D-${dday}` : '시험일 경과'} · 매일{' '}
              {profile.dailyStudyMinutes}분
            </Text>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.loginPrompt}>
              학습 플랜을 설정하고 체계적으로 준비하세요
            </Text>
            <Pressable
              style={styles.loginButton}
              onPress={() => router.push('/onboarding/step1')}
            >
              <Text style={styles.loginButtonText}>학습 플랜 만들기</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 학습 통계 */}
      {records.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trophy" size={18} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>학습 통계</Text>
          </View>
          <View style={styles.statsGrid}>
            {[
              { value: records.length, label: '응시 횟수' },
              {
                value: Math.round(
                  records.reduce((sum, r) => sum + r.score, 0) / records.length,
                ),
                label: '평균 점수',
              },
              { value: Math.max(...records.map((r) => r.score)), label: '최고 점수' },
              { value: records[records.length - 1]?.grade || '-', label: '최근 급수' },
            ].map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statNumber}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 메뉴 */}
      <View style={styles.menuGroup}>
        {profile?.onboardingCompleted && (
          <MenuItem
            icon="settings"
            label="학습 설정 변경"
            onPress={() => router.push('/settings' as any)}
          />
        )}
        <MenuItem
          icon="diamond"
          label="프리미엄 구독"
          onPress={() => router.push('/premium' as any)}
          iconColor="#F59E0B"
        />
        <MenuItem
          icon="refresh-circle"
          label="학습 설정 초기화"
          onPress={handleResetOnboarding}
        />
        <MenuItem icon="information-circle" label="앱 정보" last />
      </View>

      <Text style={styles.version}>한국사 마스터 v1.0.0</Text>
    </Container>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  iconColor = COLORS.textSecondary,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  iconColor?: string;
  last?: boolean;
}) {
  return (
    <>
      <Pressable style={styles.menuItem} onPress={onPress}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={styles.menuText}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
      </Pressable>
      {!last && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  // --- Profile ---
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileGoal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginPrompt: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // --- Card ---
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // --- Menu ---
  menuGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  version: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
