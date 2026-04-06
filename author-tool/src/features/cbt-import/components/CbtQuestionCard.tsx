import { useState } from 'react';
import type { CbtQuestion } from '../api/cbt.api';

interface Props {
  question: CbtQuestion;
  index: number;
}

export function CbtQuestionCard({ question, index }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Question header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-bold text-indigo-600">Q{question.number}</span>
        {question.answer_rate != null && (
          <span className="text-xs text-gray-400">정답률 {question.answer_rate}%</span>
        )}
      </div>

      {/* Question text */}
      {question.text && (
        <p className="text-sm mb-3 whitespace-pre-wrap">{question.text}</p>
      )}

      {/* Question images */}
      {question.images && question.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {question.images.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt={`문제 ${question.number} 이미지 ${i + 1}`}
              className="max-h-48 rounded border object-contain"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Choices */}
      <div className="space-y-1.5 mb-3">
        {question.choices.map((choice) => (
          <div
            key={choice.number}
            className={`flex items-start gap-2 px-3 py-1.5 rounded text-sm ${
              showAnswer && choice.is_correct
                ? 'bg-green-50 text-green-700 font-medium ring-1 ring-green-200'
                : showAnswer && !choice.is_correct
                  ? 'text-gray-400'
                  : 'hover:bg-gray-50'
            }`}
          >
            <span className="font-mono text-xs mt-0.5 shrink-0">{choice.number}.</span>
            <div className="flex-1">
              {choice.text && <span>{choice.text}</span>}
              {choice.images && choice.images.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {choice.images.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={`선지 ${choice.number} 이미지`}
                      className="max-h-24 rounded border object-contain"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show answer button */}
      <button
        onClick={() => setShowAnswer(!showAnswer)}
        className="text-xs text-indigo-600 hover:text-indigo-800"
      >
        {showAnswer ? '정답 숨기기' : '정답 보기'}
      </button>

      {/* Explanation */}
      {showAnswer && question.explanation && (
        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800 whitespace-pre-wrap">
          {question.explanation}
        </div>
      )}
    </div>
  );
}
