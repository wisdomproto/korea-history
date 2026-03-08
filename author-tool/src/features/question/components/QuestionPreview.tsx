import type { Question } from '@/lib/types';

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

export function QuestionPreview({ question }: { question: Question }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-500">앱 미리보기</h3>
      <div className="rounded-lg bg-gray-50 p-4">
        {/* Question Number */}
        <div className="mb-2 text-xs text-gray-400">
          Q. {question.questionNumber} / {question.points}점
        </div>

        {/* 자료: 지문 텍스트 and/or 이미지 */}
        {(question.passage || question.imageUrl) && (
          <div className="mb-3 rounded border-l-4 border-amber-400 bg-amber-50 p-3 space-y-2">
            {question.passage && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.passage}</p>
            )}
            {question.imageUrl && (
              <img src={question.imageUrl} alt="" className="w-full rounded-lg border object-contain bg-gray-100" />
            )}
          </div>
        )}

        {/* Content */}
        <p className="mb-4 text-sm font-medium leading-relaxed whitespace-pre-wrap">{question.content}</p>

        {/* Choices */}
        <div className="space-y-2">
          {question.choices.map((choice, i) => {
            const cImg = question.choiceImages?.[i];
            return (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  question.correctAnswer === i + 1
                    ? 'border-green-400 bg-green-50 font-medium text-green-800'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                <span className="shrink-0 font-mono">{CHOICE_LABELS[i]}</span>
                <div className="flex-1 space-y-1">
                  {choice && <span>{choice}</span>}
                  {cImg && <img src={cImg} alt="" className="w-full max-h-28 rounded border object-contain bg-gray-50" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
