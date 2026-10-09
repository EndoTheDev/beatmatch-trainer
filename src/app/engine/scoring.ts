/**
 * Scoring: challenge-mode grading.
 * Pure logic, unit-testable in Node.
 */

export type Grade = 'S' | 'A' | 'B' | 'C' | 'F';

/** Difficulty ladder: level 1..10 -> tempo gap percent for deck B's hidden offset. */
export function ladderGapPercent(level: number): number {
  const clamped = Math.min(10, Math.max(1, Math.round(level)));
  return 0.3 + ((clamped - 1) / 9) * (2.0 - 0.3);
}

/**
 * Time-in-phase score for one round.
 * samples: booleans collected at a fixed rate while the round runs.
 * Returns percent 0..100.
 */
export function timeInPhasePercent(samples: boolean[]): number {
  if (samples.length === 0) return 0;
  const inPhase = samples.filter(Boolean).length;
  return (inPhase / samples.length) * 100;
}

export function gradeFor(percent: number): Grade {
  if (percent >= 95) return 'S';
  if (percent >= 85) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 50) return 'C';
  return 'F';
}

/** Round result summary. */
export interface RoundResult {
  percent: number;
  grade: Grade;
  level: number;
  seconds: number;
}

export function summarize(samples: boolean[], level: number, seconds: number): RoundResult {
  const percent = timeInPhasePercent(samples);
  return { percent, grade: gradeFor(percent), level, seconds };
}