/**
 * Lookahead scheduler: drives both decks off the AudioContext clock.
 * ponytail: single shared scheduler, lookahead + interval tick; the
 * setInterval only WAKES the scheduler - all timing truth is AudioContext
 * time (ctx.currentTime), so browser timer jitter never reaches the audio.
 * Ceiling: interval-granularity latency for nudge audible response (~25ms
 * lookahead buffer). Upgrade path: schedule nudges immediately at
 * currentTime + epsilon instead of through the lookahead window.
 */

import { DrumKit } from './kits';
import { triggerStep, voicesOnStep } from './synth';
import { DeckState, advance, beatSeconds } from './deck';

export const LOOKAHEAD_SECONDS = 0.12;
export const TICK_INTERVAL_MS = 25;

export interface ScheduledDeck {
  state: DeckState;
  kit: DrumKit;
  /** absolute AudioContext time the playhead was at beatPos */
  anchorTime: number;
  /** beat position at anchorTime */
  anchorBeatPos: number;
  /** beats of silence already scheduled up to (exclusive) */
  scheduledUpToBeat: number;
  gainNode: unknown;
  volume: number;
  muted: boolean;
}

export function createScheduledDeck(state: DeckState, kit: DrumKit, anchorTime: number, gainNode: unknown): ScheduledDeck {
  return {
    state,
    kit,
    anchorTime,
    anchorBeatPos: state.offsetBeats,
    scheduledUpToBeat: state.offsetBeats,
    gainNode,
    volume: 0.8,
    muted: false,
  };
}

/**
 * Absolute beat position of a deck at ctx time t (linear interpolation
 * from its anchor; re-anchored whenever pitch/nudge changes).
 */
export function beatPosAt(deck: ScheduledDeck, t: number): number {
  if (!deck.state.playing) return deck.anchorBeatPos;
  return deck.anchorBeatPos + (t - deck.anchorTime) / beatSeconds(deck.state);
}

/** Re-anchor after a rate/offset change (call before applying changes is wrong - call after). */
export function reanchor(deck: ScheduledDeck, t: number): void {
  deck.anchorBeatPos = beatPosAt(deck, t);
  deck.anchorTime = t;
}

/**
 * Schedule all voice hits falling in (scheduledUpToBeat, untilBeat].
 * Returns the number of events scheduled.
 */
export function scheduleWindow(deck: ScheduledDeck, ctx: { currentTime: number }, untilBeat: number): number {
  let count = 0;
  const spb = beatSeconds(deck.state);
  // find the first unscheduled 16th-step boundary
  let beat = Math.ceil(deck.scheduledUpToBeat * 4) / 4;
  while (beat < untilBeat) {
    const step16 = ((Math.floor(beat * 4) % 16) + 16) % 16; // 0..15
    const voices = voicesOnStep(deck.kit, step16 + 1); // 1-based
    const when = deck.anchorTime + (beat - deck.anchorBeatPos) * spb;
    if (voices.length > 0) {
      triggerStep(ctx as never, deck.kit, voices, when, deck.gainNode, deck.muted ? 0 : deck.volume);
      count += voices.length;
    }
    beat += 0.25;
  }
  deck.scheduledUpToBeat = Math.max(deck.scheduledUpToBeat, untilBeat);
  return count;
}

/**
 * One scheduler tick for both decks: advance positions, schedule the
 * lookahead window. Returns (aPos, bPos) at ctx.currentTime.
 */
export function tick(
  a: ScheduledDeck,
  b: ScheduledDeck,
  ctx: { currentTime: number },
  windowSeconds = LOOKAHEAD_SECONDS,
): { aPos: number; bPos: number } {
  const now = ctx.currentTime;
  const horizon = now + windowSeconds;
  for (const deck of [a, b]) {
    if (!deck.state.playing) continue;
    const untilBeat = beatPosAt(deck, horizon);
    scheduleWindow(deck, ctx, untilBeat);
  }
  return { aPos: beatPosAt(a, now), bPos: beatPosAt(b, now) };
}

/** Advance helper used by tests to simulate passage of time. */
export function simulateAdvance(deck: ScheduledDeck, dt: number): void {
  const pos = advance(deck.anchorBeatPos, deck.state, dt);
  deck.anchorBeatPos = pos;
  deck.anchorTime += dt;
}