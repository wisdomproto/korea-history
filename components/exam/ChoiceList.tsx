import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { COLORS, IMAGE_BASE_URL } from '@/lib/constants';

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
            <View style={[styles.label, isSelected && styles.labelSelected]}>
              <Text style={[styles.labelText, isSelected && styles.labelTextSelected]}>
                {CHOICE_LABELS[index]}
              </Text>
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
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  choiceSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF4FB',
  },
  label: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  labelSelected: {
    backgroundColor: COLORS.primary,
  },
  labelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  labelTextSelected: {
    color: '#fff',
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
    fontWeight: '500',
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
