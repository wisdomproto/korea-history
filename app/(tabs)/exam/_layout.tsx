import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';

/** Back button that always returns to the study tab */
function BackToStudy() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.navigate('/study')} style={{ padding: 4 }}>
      <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
    </Pressable>
  );
}

/** Shared options for screens entered directly from the study tab */
const entryScreenOptions = {
  headerLeft: () => <BackToStudy />,
};

export default function ExamLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { fontWeight: 'bold', color: COLORS.text },
        headerTintColor: COLORS.primary,
      }}
    >
      <Stack.Screen name="select" options={{ title: '시험 선택', ...entryScreenOptions }} />
      <Stack.Screen name="[examId]" options={{ title: '모의고사' }} />
      <Stack.Screen name="result/[examId]" options={{ title: '결과' }} />
      <Stack.Screen name="explanation/[examId]" options={{ title: '해설' }} />
      <Stack.Screen name="review" options={{ title: '오답 복습', ...entryScreenOptions }} />
      <Stack.Screen name="unit" options={{ title: '단원별 학습', ...entryScreenOptions }} />
      <Stack.Screen name="custom" options={{ title: '맞춤형 학습', ...entryScreenOptions }} />
      <Stack.Screen name="keyword" options={{ title: '키워드별 학습', ...entryScreenOptions }} />
      <Stack.Screen name="diagnostic" options={{ title: '진단 테스트', ...entryScreenOptions }} />
    </Stack>
  );
}
