import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { getSubscription, saveSubscription, SubscriptionState } from '@/lib/storage';

const FEATURES = [
  { name: '기출문제 풀이', free: '최근 3회분', premium: '전체 회차' },
  { name: 'AI 해설', free: '시험당 5문항', premium: '무제한' },
  { name: '오답 복습', free: '✓', premium: '✓' },
  { name: '시대별 분석', free: '✓', premium: '✓' },
  { name: '진단 테스트', free: '✓', premium: '✓' },
  { name: '취약점 맞춤 추천', free: '—', premium: '✓' },
  { name: '광고 제거', free: '—', premium: '✓' },
  { name: '학습 플랜 재조정', free: '—', premium: '✓' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);

  useEffect(() => {
    getSubscription().then(setSubscription);
  }, []);

  const handleSubscribe = () => {
    Alert.alert(
      '구독 확인',
      selectedPlan === 'monthly'
        ? '월 3,900원 프리미엄을 시작합니다.\n7일 무료 체험이 제공됩니다.'
        : '연 29,900원 프리미엄을 시작합니다.\n7일 무료 체험이 제공됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구독 시작',
          onPress: async () => {
            // MVP에서는 로컬 상태만 변경 (실제로는 인앱결제 연동)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (selectedPlan === 'monthly' ? 37 : 372)); // 7일 무료 + 기간
            const newSub: SubscriptionState = {
              isPremium: true,
              plan: selectedPlan,
              expiresAt: expiresAt.toISOString(),
              freeExplanationsUsed: {},
            };
            await saveSubscription(newSub);
            Alert.alert('🎉 구독 완료!', '7일 무료 체험이 시작되었습니다.\n모든 기능을 자유롭게 이용하세요!');
            router.back();
          },
        },
      ],
    );
  };

  const isPremium = subscription?.isPremium ?? false;

  return (
    <>
      <Stack.Screen options={{ title: '프리미엄', headerBackTitle: '뒤로' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.title}>한국사 마스터 프리미엄</Text>
          <Text style={styles.subtitle}>
            합격을 위한 완벽한 학습 도구를 모두 활용하세요
          </Text>
        </View>

        {isPremium && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>✓ 프리미엄 구독 중</Text>
            <Text style={styles.activeExpiry}>
              만료일: {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ko-KR') : '-'}
            </Text>
          </View>
        )}

        {/* 기능 비교표 */}
        <View style={styles.compareCard}>
          <View style={styles.compareHeader}>
            <Text style={[styles.compareCol, styles.compareColName]}>기능</Text>
            <Text style={[styles.compareCol, styles.compareColFree]}>무료</Text>
            <Text style={[styles.compareCol, styles.compareColPremium]}>프리미엄</Text>
          </View>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.compareRow, i % 2 === 0 && styles.compareRowAlt]}>
              <Text style={[styles.compareCol, styles.compareColName]}>{f.name}</Text>
              <Text style={[styles.compareCol, styles.compareColFree]}>{f.free}</Text>
              <Text style={[styles.compareCol, styles.compareColPremium, styles.premiumValue]}>{f.premium}</Text>
            </View>
          ))}
        </View>

        {/* 가격 옵션 */}
        {!isPremium && (
          <>
            <Text style={styles.priceTitle}>구독 플랜 선택</Text>

            <Pressable
              style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <View style={styles.planBest}>
                <Text style={styles.planBestText}>BEST</Text>
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>연간 구독</Text>
                <Text style={styles.planPrice}>₩29,900 / 년</Text>
                <Text style={styles.planSub}>월 ₩2,492 · 36% 할인</Text>
              </View>
              <View style={[styles.planRadio, selectedPlan === 'yearly' && styles.planRadioSelected]}>
                {selectedPlan === 'yearly' && <View style={styles.planRadioDot} />}
              </View>
            </Pressable>

            <Pressable
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View style={styles.planInfo}>
                <Text style={styles.planName}>월간 구독</Text>
                <Text style={styles.planPrice}>₩3,900 / 월</Text>
              </View>
              <View style={[styles.planRadio, selectedPlan === 'monthly' && styles.planRadioSelected]}>
                {selectedPlan === 'monthly' && <View style={styles.planRadioDot} />}
              </View>
            </Pressable>

            <View style={styles.trialInfo}>
              <Text style={styles.trialText}>🎁 7일 무료 체험 포함</Text>
              <Text style={styles.trialDesc}>
                체험 기간 중 언제든 해지 가능합니다
              </Text>
            </View>

            <Pressable style={styles.subscribeButton} onPress={handleSubscribe}>
              <Text style={styles.subscribeButtonText}>
                무료 체험 시작하기
              </Text>
            </Pressable>

            <Pressable style={styles.restoreButton}>
              <Text style={styles.restoreButtonText}>구매 복원</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { alignItems: 'center', paddingVertical: 24 },
  crown: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  activeBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  activeBadgeText: { fontSize: 16, fontWeight: '700', color: COLORS.success },
  activeExpiry: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  compareCard: { backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  compareHeader: {
    flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 12,
  },
  compareRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  compareRowAlt: { backgroundColor: '#F8F9FF' },
  compareCol: { fontSize: 13, color: COLORS.text },
  compareColName: { flex: 2, fontWeight: '500' },
  compareColFree: { flex: 1, textAlign: 'center', color: COLORS.textSecondary },
  compareColPremium: { flex: 1, textAlign: 'center' },
  premiumValue: { color: COLORS.primary, fontWeight: '600' },

  priceTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  planCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
  },
  planCardSelected: { borderColor: COLORS.primary, backgroundColor: '#F0F6FF' },
  planBest: {
    backgroundColor: COLORS.secondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    position: 'absolute', top: -10, left: 16,
  },
  planBestText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  planPrice: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  planSub: { fontSize: 12, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  planRadio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  planRadioSelected: { borderColor: COLORS.primary },
  planRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },

  trialInfo: { alignItems: 'center', marginVertical: 16 },
  trialText: { fontSize: 15, fontWeight: '700', color: COLORS.secondary },
  trialDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  subscribeButton: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  subscribeButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  restoreButton: { alignItems: 'center', paddingVertical: 16 },
  restoreButtonText: { fontSize: 14, color: COLORS.textSecondary, textDecorationLine: 'underline' },
});
