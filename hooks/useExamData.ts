/**
 * React hooks for async exam data loading from R2.
 *
 * Wraps the fetchExams/fetchQuestions functions with loading/error states.
 */
import { useState, useEffect } from 'react';
import { Exam, Question } from '@/lib/types';
import {
  fetchExams,
  fetchExamById,
  fetchQuestionsByExamId,
  fetchAllQuestions,
  fetchQuestionById,
} from '@/lib/examData';

interface UseDataResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

/** Load the list of all exams (from manifest) */
export function useExams(): UseDataResult<Exam[]> {
  const [data, setData] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchExams()
      .then((exams) => {
        if (!cancelled) {
          setData(exams);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, isLoading, error };
}

/** Load a single exam by ID */
export function useExamById(examId: number): UseDataResult<Exam | undefined> {
  const [data, setData] = useState<Exam | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchExamById(examId)
      .then((exam) => {
        if (!cancelled) {
          setData(exam);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [examId]);

  return { data, isLoading, error };
}

/** Load questions for an exam */
export function useExamQuestions(examId: number): UseDataResult<Question[]> {
  const [data, setData] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchQuestionsByExamId(examId)
      .then((questions) => {
        if (!cancelled) {
          setData(questions);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [examId]);

  return { data, isLoading, error };
}

/** Load ALL questions across all exams */
export function useAllQuestions(): UseDataResult<Question[]> {
  const [data, setData] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAllQuestions()
      .then((questions) => {
        if (!cancelled) {
          setData(questions);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, isLoading, error };
}

/** Load exam + questions together */
export function useExamWithQuestions(examId: number): UseDataResult<{
  exam: Exam | undefined;
  questions: Question[];
}> {
  const [data, setData] = useState<{ exam: Exam | undefined; questions: Question[] }>({
    exam: undefined,
    questions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([fetchExamById(examId), fetchQuestionsByExamId(examId)])
      .then(([exam, questions]) => {
        if (!cancelled) {
          setData({ exam, questions });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [examId]);

  return { data, isLoading, error };
}
