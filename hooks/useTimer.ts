import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  totalMinutes: number;
  initialSeconds?: number; // 복원용 초기 잔여 시간
  warningMinutes?: number;
  onTimeUp?: () => void;
  onWarning?: () => void;
}

export function useTimer({
  totalMinutes,
  initialSeconds,
  warningMinutes = 5,
  onTimeUp,
  onWarning,
}: UseTimerOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState(
    initialSeconds ?? totalMinutes * 60
  );
  const [isRunning, setIsRunning] = useState(true);
  const [hasWarned, setHasWarned] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);
  const onWarningRef = useRef(onWarning);

  onTimeUpRef.current = onTimeUp;
  onWarningRef.current = onWarning;

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;

        if (!hasWarned && next <= warningMinutes * 60 && next > 0) {
          setHasWarned(true);
          onWarningRef.current?.();
        }

        if (next <= 0) {
          setIsRunning(false);
          onTimeUpRef.current?.();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remainingSeconds, hasWarned, warningMinutes]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalSeconds = totalMinutes * 60;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const isWarning = remainingSeconds <= warningMinutes * 60 && remainingSeconds > 0;
  const isTimeUp = remainingSeconds <= 0;

  return {
    remainingSeconds,
    minutes,
    seconds,
    formattedTime,
    progress,
    isRunning,
    isWarning,
    isTimeUp,
    pause,
    resume,
  };
}
