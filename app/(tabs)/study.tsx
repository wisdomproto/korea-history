import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '@/components/Container';
import { COLORS, SHADOWS, RADIUS } from '@/lib/constants';

const MENU_ITEMS = [
  {
    icon: 'document-text' as const,
    iconColor: '#3B82F6',
    bgColor: '#EFF6FF',
    title: 'CBT 모의고사',
    desc: '실제 시험과 동일한 환경에서 기출문제를 풀어보세요',
    path: '/exam/select',
  },
  {
    icon: 'library' as const,
    iconColor: '#8B5CF6',
    bgColor: '#F5F3FF',
    title: '단원별 학습',
    desc: '시대별·주제별로 문제를 풀어보세요',
    path: '/exam/unit',
  },
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

  return (
    <Container>
      {MENU_ITEMS.map((item) => (
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
      ))}
    </Container>
  );
}

const styles = StyleSheet.create({
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
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
