import { useState, useEffect, useCallback } from 'react';

export function useGameClock(
  initialSeconds: number,
  activeColor: 'w' | 'b',
  isPaused: boolean
) {
  const [times, setTimes] = useState({ w: initialSeconds, b: initialSeconds });
  const [expired, setExpired] = useState<'w' | 'b' | null>(null);

  useEffect(() => {
    if (initialSeconds === 0 || isPaused || expired) return;

    const interval = setInterval(() => {
      setTimes(prev => {
        const newVal = Math.max(0, prev[activeColor] - 1);
        const updated = { ...prev, [activeColor]: newVal };
        if (newVal === 0) {
          setExpired(activeColor);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeColor, isPaused, initialSeconds, expired]);

  const resetClock = useCallback(() => {
    setTimes({ w: initialSeconds, b: initialSeconds });
    setExpired(null);
  }, [initialSeconds]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    whiteTime: times.w,
    blackTime: times.b,
    expired,
    formatTime,
    resetClock,
    hasClocks: initialSeconds > 0,
  };
}
