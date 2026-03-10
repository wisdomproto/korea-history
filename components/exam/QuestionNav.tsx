import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { COLORS, RADIUS } from '@/lib/constants';
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
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dotCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    width: 40,
    borderRadius: RADIUS.full,
  },
  dotAnswered: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  dotTextCurrent: {
    color: '#fff',
    fontWeight: '700',
  },
  dotTextAnswered: {
    color: '#fff',
  },
});
