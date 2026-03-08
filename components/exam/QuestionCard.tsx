import { useState } from 'react';
import { StyleSheet, View, Text, Image, ActivityIndicator } from 'react-native';
import { Question } from '@/lib/types';
import { COLORS, IMAGE_BASE_URL } from '@/lib/constants';

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

  const hasImage = question.imageUrl && question.imageUrl !== 'TODO_ADD_IMAGE';

  return (
    <View style={styles.container}>
      <Text style={styles.questionNumber}>
        Q. {questionIndex + 1} / {totalQuestions}
      </Text>
      {/* 자료 영역: 지문 텍스트 and/or 이미지 */}
      {(question.passage || hasImage) && (
        <View style={styles.passageBox}>
          {question.passage && (
            <Text style={styles.passageText}>{question.passage}</Text>
          )}
          {hasImage && !imgError && (
            <View style={[styles.imageContainer, question.passage ? styles.imageWithPassage : null]}>
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
          )}
          {hasImage && imgError && (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imageText}>[이미지 로드 실패]</Text>
            </View>
          )}
        </View>
      )}
      <Text style={styles.content}>{question.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  passageBox: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  passageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  content: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    minHeight: 120,
  },
  imageWithPassage: {
    marginTop: 10,
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
