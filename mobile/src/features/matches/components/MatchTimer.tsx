import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { typography } from '../../../theme/typography';

interface MatchTimerProps {
  initialSeconds?: number;
  periodDurationSeconds?: number;
  lastResumedAt?: string | null;
  isPaused?: boolean;
  countdown?: boolean;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  initialSeconds = 0,
  periodDurationSeconds = 600,
  lastResumedAt = null,
  isPaused = false,
  countdown = true,
}) => {
  const computeCurrentSeconds = (): number => {
    let currentElapsed = initialSeconds;
    if (!isPaused && lastResumedAt) {
      const resumedTime = new Date(lastResumedAt).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - resumedTime) / 1000));
      currentElapsed += diffSec;
    }
    return currentElapsed;
  };

  const [elapsed, setElapsed] = useState<number>(computeCurrentSeconds());

  useEffect(() => {
    setElapsed(computeCurrentSeconds());
  }, [initialSeconds, lastResumedAt, isPaused]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, lastResumedAt]);

  const displaySeconds = countdown
    ? Math.max(0, periodDurationSeconds - elapsed)
    : elapsed;

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Text style={[styles.timerText, isPaused && styles.timerPaused]}>
      {formatTime(displaySeconds)}
    </Text>
  );
};

const styles = StyleSheet.create({
  timerText: {
    ...typography.h1,
    color: '#00E676', // Bright neon green for digital LED scoreboard
    fontFamily: 'monospace',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  timerPaused: {
    color: '#FFB300', // Amber warning color when paused
  },
});
