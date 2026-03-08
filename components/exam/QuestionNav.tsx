import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { COLORS } from '@/lib/constants';
import { UserAnswer } from '@/lib/types';

interface Props {
  answers: UserAnswer[];
  currentIndex: number;
  onPress: (index: number) => void;
}

export default function QuestionNav({ answers, currentIndex, onPress }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {answers.map((answer, index) => {
        const isCurrent = index === currentIndex;
        const isAnswered = answer.selectedAnswer !== null;

        return (
          <Pressable
            key={index}
            style={[
              styles.dot,
              isCurrent && styles.dotCurrent,
              isAnswered && !isCurrent && styles.dotAnswered,
            ]}
            onPress={() => onPress(index)}
          >
            <Text
              style={[
                styles.dotText,
                isCurrent && styles.dotTextCurrent,
                isAnswered && !isCurrent && styles.dotTextAnswered,
              ]}
            >
              {index + 1}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dotCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotAnswered: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.success,
  },
  dotText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  dotTextCurrent: {
    color: '#fff',
  },
  dotTextAnswered: {
    color: COLORS.success,
  },
});
