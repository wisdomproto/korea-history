import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '@/components/Container';
import { COLORS, SHADOWS, RADIUS } from '@/lib/constants';

const STUDY_MODES = [
  {
    icon: 'document-text' as const,
    iconColor: '#6366F1',
    bgColor: '#EEF2FF',
    title: '회차별',
    desc: '시험 회차를 선택하여 기출문제를 풀어보세요',
    path: '/exam/select',
  },
  {
    icon: 'options' as const,
    iconColor: '#8B5CF6',
    bgColor: '#F5F3FF',
    title: '맞춤형',
    desc: '시대와 유형을 직접 선택하여 학습하세요',
    path: '/exam/custom',
  },
  {
    icon: 'pricetag' as const,
    iconColor: '#EC4899',
    bgColor: '#FDF2F8',
    title: '키워드별',
    desc: '핵심 키워드로 관련 문제를 모아 풀어보세요',
    path: '/exam/keyword',
  },
];

const TOOLS = [
  {
    icon: 'refresh-circle' as const,
    iconColor: '#F59E0B',
    bgColor: '#FFFBEB',
    title: '오답 복습',
    desc: '틀린 문제를 다시 풀어보세요',
    path: '/exam/review',
  },
  {
    icon: 'analytics' as const,
    iconColor: '#10B981',
    bgColor: '#ECFDF5',
    title: '진단 테스트',
    desc: '5분 만에 나의 실력을 진단해보세요',
    path: '/exam/diagnostic',
  },
];

export default function StudyScreen() {
  const router = useRouter();

  const renderCard = (item: (typeof STUDY_MODES)[number]) => (
    <Pressable
      key={item.title}
      style={styles.menuCard}
      onPress={() => router.push(item.path as any)}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.bgColor }]}>
        <Ionicons name={item.icon} size={24} color={item.iconColor} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuDesc}>{item.desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    </Pressable>
  );

  return (
    <Container scroll>
      {/* 문제풀이 섹션 */}
      <View style={styles.sectionHeader}>
        <Ionicons name="book" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>문제풀이</Text>
      </View>
      {STUDY_MODES.map(renderCard)}

      {/* 학습 도구 섹션 */}
      <View style={[styles.sectionHeader, { marginTop: 12 }]}>
        <Ionicons name="build" size={18} color={COLORS.textSecondary} />
        <Text style={styles.sectionTitle}>학습 도구</Text>
      </View>
      {TOOLS.map(renderCard)}
    </Container>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F4',
    ...SHADOWS.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  menuDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
