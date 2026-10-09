/**
 * Deck model: transport + tempo math for one deck.
 * Pure logic, no Web Audio - unit-testable in Node.
 *
 * The core concept: a deck advances a continuous "beat position" from a
 * virtual start time. Everything (nudge, pitch, phase) manipulates either
 * the rate or the position offset.
 */

export interface DeckState {
  /** nominal BPM (before pitch fader) */
  bpm: number;
  /** pitch fader position, -8..+8 (%) */
  pitchPercent: number;
  /** playhead offset in beats (nudge changes this; cue sets/returns to it) */
  offsetBeats: number;
  /** cue point in beats */
  cueBeats: number;
  playing: boolean;
}

export function createDeck(bpm: number): DeckState {
  return { bpm, pitchPercent: 0, offsetBeats: 0, cueBeats: 0, playing: false };
}

/** Effective BPM after pitch fader. */
export function effectiveBpm(deck: DeckState): number {
  return deck.bpm * (1 + deck.pitchPercent / 100);
}

/** Seconds per beat at the current effective tempo. */
export function beatSeconds(deck: DeckState): number {
  return 60 / effectiveBpm(deck);
}

/**
 * Advance the playhead by wall-clock dt.
 * Returns the new absolute beat position (monotonic, grows forever).
 */
export function advance(beatPos: number, deck: DeckState, dtSeconds: number): number {
  if (!deck.playing) return beatPos;
  return beatPos + dtSeconds / beatSeconds(deck);
}

/**
 * Nudge: temporarily shift phase. We model it as an instant offset change
 * in beats (positive = push forward/ahead, negative = pull back).
 */
export function nudge(deck: DeckState, beats: number): void {
  deck.offsetBeats += beats;
}

/**
 * Phase difference between two decks, in beats, wrapped to [-0.5, 0.5).
 * Positive = deck B is AHEAD of deck A.
 */
export function phaseDiff(aPos: number, bPos: number): number {
  let d = (bPos - aPos) % 1;
  if (d >= 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

/** In-phase threshold: 10% of the beat period. */
export const IN_PHASE_TOLERANCE = 0.1;

export function isInPhase(diffBeats: number): boolean {
  return Math.abs(diffBeats) < IN_PHASE_TOLERANCE;
}