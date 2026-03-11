import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, IMAGE_BASE_URL, RADIUS, SHADOWS } from '@/lib/constants';

interface Props {
  choices: string[];
  choiceImages?: (string | null)[];
  selectedAnswer: number | null;
  onSelect: (choiceNumber: number) => void;
  /** Correct answer number (1-5). When provided with showResult, enables feedback mode. */
  correctAnswer?: number;
  /** Show correct/wrong feedback. Disables further selection. */
  showResult?: boolean;
}

function resolveImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${IMAGE_BASE_URL}${url}`;
}

export default function ChoiceList({ choices, choiceImages, selectedAnswer, onSelect, correctAnswer, showResult }: Props) {
  const feedbackMode = showResult && correctAnswer != null;

  return (
    <View style={styles.container}>
      {choices.map((choice, index) => {
        const choiceNumber = index + 1;
        const isSelected = selectedAnswer === choiceNumber;
        const choiceImg = choiceImages?.[index];

        const isCorrect = feedbackMode && choiceNumber === correctAnswer;
        const isWrong = feedbackMode && isSelected && choiceNumber !== correctAnswer;

        // Determine choice style
        const choiceStyle = [
          styles.choice,
          isCorrect && styles.choiceCorrect,
          isWrong && styles.choiceWrong,
          !feedbackMode && isSelected && styles.choiceSelected,
        ];

        // Determine badge content & style
        let badgeStyle = [styles.badge];
        let badgeContent: React.ReactNode;

        if (isCorrect) {
          badgeStyle = [styles.badge, styles.badgeCorrect];
          badgeContent = <Ionicons name="checkmark" size={14} color="#fff" />;
        } else if (isWrong) {
          badgeStyle = [styles.badge, styles.badgeWrong];
          badgeContent = <Ionicons name="close" size={14} color="#fff" />;
        } else if (!feedbackMode && isSelected) {
          badgeStyle = [styles.badge, styles.badgeSelected];
          badgeContent = <Ionicons name="checkmark" size={14} color="#fff" />;
        } else {
          badgeContent = <Text style={styles.badgeText}>{choiceNumber}</Text>;
        }

        // Determine text style
        const textStyle = [
          styles.choiceText,
          isCorrect && styles.textCorrect,
          isWrong && styles.textWrong,
          !feedbackMode && isSelected && styles.choiceTextSelected,
        ];

        return (
          <Pressable
            key={choiceNumber}
            style={choiceStyle}
            onPress={() => onSelect(choiceNumber)}
            disabled={feedbackMode}
          >
            <View style={badgeStyle}>
              {badgeContent}
            </View>
            <View style={styles.choiceContent}>
              {choice ? (
                <Text style={textStyle}>{choice}</Text>
              ) : null}
              {choiceImg && choiceImg !== 'TODO_ADD_IMAGE' && (
                <Image
                  source={{ uri: resolveImageUrl(choiceImg) }}
                  style={[styles.choiceImage, !choice && styles.choiceImageOnly]}
                  resizeMode="contain"
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E8E8F4',
    ...SHADOWS.sm,
  },
  choiceSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  choiceCorrect: {
    borderColor: COLORS.success,
    backgroundColor: '#F1F8F1',
  },
  choiceWrong: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFF5F5',
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeSelected: {
    backgroundColor: COLORS.primary,
  },
  badgeCorrect: {
    backgroundColor: COLORS.success,
  },
  badgeWrong: {
    backgroundColor: COLORS.danger,
  },
  badgeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  choiceContent: {
    flex: 1,
  },
  choiceText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  choiceTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  textCorrect: {
    color: COLORS.success,
    fontWeight: '600',
  },
  textWrong: {
    color: COLORS.danger,
  },
  choiceImage: {
    width: '100%',
    height: 120,
    marginTop: 8,
    borderRadius: 4,
  },
  choiceImageOnly: {
    marginTop: 0,
  },
});
