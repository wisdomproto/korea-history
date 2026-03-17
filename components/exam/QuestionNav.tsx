import { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/lib/constants';
import { UserAnswer } from '@/lib/types';

const DOT_SIZE = 32;
const DOT_CURRENT_SIZE = 40;
const DOT_GAP = 6;

interface Props {
  answers: UserAnswer[];
  currentIndex: number;
  onPress: (index: number) => void;
}

export default function QuestionNav({ answers, currentIndex, onPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const containerWidth = useRef(0);
  const scrollOffset = useRef(0);

  const scrollToIndex = useCallback((index: number) => {
    const offset = index * (DOT_SIZE + DOT_GAP) - containerWidth.current / 2 + DOT_CURRENT_SIZE / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => scrollToIndex(currentIndex), 50);
    return () => clearTimeout(timer);
  }, [currentIndex, scrollToIndex]);

  const handleLayout = (e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = e.nativeEvent.contentOffset.x;
  };

  const scrollBy = (direction: -1 | 1) => {
    const step = containerWidth.current * 0.6;
    const next = scrollOffset.current + direction * step;
    scrollRef.current?.scrollTo({ x: Math.max(0, next), animated: true });
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <Pressable style={styles.arrowBtn} onPress={() => scrollBy(-1)}>
        <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={styles.scroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

      <Pressable style={styles.arrowBtn} onPress={() => scrollBy(1)}>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBtn: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexDirection: 'row',
    gap: DOT_GAP,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
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
    width: DOT_CURRENT_SIZE,
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
