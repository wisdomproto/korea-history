import { Stack } from 'expo-router';
import { COLORS } from '@/lib/constants';

export default function ExamLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { fontWeight: 'bold', color: COLORS.text },
        headerTintColor: COLORS.primary,
      }}
    >
      <Stack.Screen name="select" options={{ title: '시험 선택' }} />
      <Stack.Screen name="[examId]" options={{ title: '모의고사' }} />
      <Stack.Screen name="result/[examId]" options={{ title: '결과' }} />
      <Stack.Screen name="explanation/[examId]" options={{ title: '해설' }} />
      <Stack.Screen name="review" options={{ title: '오답 복습' }} />
      <Stack.Screen name="unit" options={{ title: '단원별 학습' }} />
      <Stack.Screen name="diagnostic" options={{ title: '진단 테스트' }} />
    </Stack>
  );
}
