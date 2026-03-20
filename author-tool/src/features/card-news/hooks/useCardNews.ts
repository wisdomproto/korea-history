import { useQuery } from '@tanstack/react-query';
import { cardNewsApi } from '../api/card-news.api';

export function useCardNewsExams() {
  return useQuery({ queryKey: ['card-news-exams'], queryFn: cardNewsApi.getExams });
}

export function useCardNewsQuestions(examNumber: number | null) {
  return useQuery({
    queryKey: ['card-news-questions', examNumber],
    queryFn: () => cardNewsApi.getQuestions(examNumber!),
    enabled: !!examNumber,
  });
}

export function useCardNewsModels() {
  return useQuery({ queryKey: ['card-news-models'], queryFn: cardNewsApi.getModels });
}
