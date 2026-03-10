import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, IMAGE_BASE_URL, RADIUS, SHADOWS } from '@/lib/constants';

interface Props {
  choices: string[];
  choiceImages?: (string | null)[];
  selectedAnswer: number | null;
  onSelect: (choiceNumber: number) => void;
}

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

function resolveImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${IMAGE_BASE_URL}${url}`;
}

export default function ChoiceList({ choices, choiceImages, selectedAnswer, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {choices.map((choice, index) => {
        const choiceNumber = index + 1;
        const isSelected = selectedAnswer === choiceNumber;
        const choiceImg = choiceImages?.[index];

        return (
          <Pressable
            key={choiceNumber}
            style={[styles.choice, isSelected && styles.choiceSelected]}
            onPress={() => onSelect(choiceNumber)}
          >
            <View style={[styles.badge, isSelected && styles.badgeSelected]}>
              {isSelected ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={styles.badgeText}>{choiceNumber}</Text>
              )}
            </View>
            <View style={styles.choiceContent}>
              {choice ? (
                <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                  {choice}
                </Text>
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
