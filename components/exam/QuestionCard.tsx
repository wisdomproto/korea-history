import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ActivityIndicator } from 'react-native';
import { Question } from '@/lib/types';
import { COLORS, IMAGE_BASE_URL, RADIUS, SHADOWS } from '@/lib/constants';

interface Props {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
}

function resolveImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${IMAGE_BASE_URL}${url}`;
}

export default function QuestionCard({ question, questionIndex, totalQuestions }: Props) {
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Reset image state when question changes
  useEffect(() => {
    setImgLoading(true);
    setImgError(false);
  }, [question.id]);

  const hasImage = question.imageUrl && question.imageUrl !== 'TODO_ADD_IMAGE';

  return (
    <View style={styles.container}>
      {/* Question number - big bold */}
      <View style={styles.numberRow}>
        <Text style={styles.questionNumber}>Q{questionIndex + 1}</Text>
        <Text style={styles.questionTotal}>/ {totalQuestions}</Text>
        {question.category && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{question.category}</Text>
          </View>
        )}
      </View>

      <Text style={styles.content}>{question.content}</Text>

      {/* Source image area */}
      {hasImage && (
        <View style={styles.passageBox}>
          {!imgError ? (
            <View style={styles.imageContainer}>
              {imgLoading && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
              )}
              <Image
                source={{ uri: resolveImageUrl(question.imageUrl!) }}
                style={styles.image}
                resizeMode="contain"
                onLoad={() => setImgLoading(false)}
                onError={() => { setImgLoading(false); setImgError(true); }}
              />
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imageText}>[이미지 로드 실패]</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 14,
  },
  questionNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  questionTotal: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
    flex: 1,
  },
  categoryTag: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  passageBox: {
    backgroundColor: '#FEF9E7',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    borderRadius: RADIUS.sm,
    padding: 14,
  },
  content: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
    fontWeight: '500',
    marginBottom: 14,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    minHeight: 120,
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: 400,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 24,
    marginTop: 12,
    alignItems: 'center',
  },
  imageText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
});
