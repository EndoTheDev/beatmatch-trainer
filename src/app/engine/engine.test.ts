/**
 * Engine unit tests - drift math, phase window, grade thresholds,
 * scheduler behavior with a fake AudioContext. Run: npx vitest run
 */

import { describe, it, expect } from 'vitest';
import { createDeck, effectiveBpm, beatSeconds, phaseDiff, isInPhase, nudge, setBend } from './deck';
import { ladderGapPercent, timeInPhasePercent, gradeFor, summarize } from './scoring';
import { KITS, getKit } from './kits';
import { voicesOnStep } from './synth';
import { createScheduledDeck, beatPosAt, reanchor, tick, scheduleWindow } from './scheduler';
import type { AudioContextLike } from './synth';

describe('deck math', () => {
  it('effectiveBpm applies pitch fader', () => {
    const d = createDeck(120);
    d.pitchPercent = 6;
    expect(effectiveBpm(d)).toBeCloseTo(127.2);
    d.pitchPercent = -8;
    expect(effectiveBpm(d)).toBeCloseTo(110.4);
  });

  it('beatSeconds is 0.5s at 120 bpm', () => {
    expect(beatSeconds(createDeck(120))).toBeCloseTo(0.5);
  });

  it('phaseDiff wraps to [-0.5, 0.5) and reports direction', () => {
    expect(phaseDiff(10, 10.1)).toBeCloseTo(0.1);       // B ahead
    expect(phaseDiff(10, 9.9)).toBeCloseTo(-0.1);       // B behind
    expect(phaseDiff(10, 11)).toBeCloseTo(0);           // full beat = in phase
    expect(phaseDiff(10, 10.75)).toBeCloseTo(-0.25);     // 0.75 wraps to -0.25
  });

  it('nudge shifts offset which shifts phase', () => {
    const a = createDeck(120);
    const b = createDeck(120);
    nudge(b, 0.12);
    expect(phaseDiff(a.offsetBeats, b.offsetBeats)).toBeCloseTo(0.12);
  });

  it('in-phase tolerance is 10% of the beat', () => {
    expect(isInPhase(0.09)).toBe(true);
    expect(isInPhase(0.11)).toBe(false);
    expect(isInPhase(-0.09)).toBe(true);
  });
});

describe('scoring', () => {
  it('ladder goes 0.3% to 2.0% and clamps', () => {
    expect(ladderGapPercent(1)).toBeCloseTo(0.3);
    expect(ladderGapPercent(10)).toBeCloseTo(2.0);
    expect(ladderGapPercent(99)).toBeCloseTo(2.0); // clamped
    expect(ladderGapPercent(5)).toBeCloseTo(0.3 + (4 / 9) * 1.7);
  });

  it('timeInPhasePercent computes ratio', () => {
    expect(timeInPhasePercent([true, true, false, false])).toBe(50);
    expect(timeInPhasePercent([])).toBe(0);
  });

  it('grade thresholds', () => {
    expect(gradeFor(100)).toBe('S');
    expect(gradeFor(95)).toBe('S');
    expect(gradeFor(94.9)).toBe('A');
    expect(gradeFor(85)).toBe('A');
    expect(gradeFor(84)).toBe('B');
    expect(gradeFor(69)).toBe('C');
    expect(gradeFor(49)).toBe('F');
  });

  it('summarize bundles result', () => {
    const r = summarize([true, true, true, false], 3, 30);
    expect(r.percent).toBe(75);
    expect(r.grade).toBe('B');
    expect(r.level).toBe(3);
  });
});

describe('kits', () => {
  it('has 4 presets with sane bpm', () => {
    expect(KITS.length).toBe(4);
    for (const k of KITS) {
      expect(k.bpm).toBeGreaterThan(60);
      expect(k.bpm).toBeLessThan(200);
      expect(k.pattern.kick.length).toBeGreaterThan(0);
    }
  });

  it('house kick hits on the four-on-the-floor', () => {
    const house = getKit('house');
    expect(voicesOnStep(house, 1)).toContain('kick');
    expect(voicesOnStep(house, 5)).toContain('kick');
    expect(voicesOnStep(house, 9)).toContain('kick');
    expect(voicesOnStep(house, 13)).toContain('kick');
    expect(voicesOnStep(house, 3)).not.toContain('kick');
  });

  it('getKit falls back to first kit', () => {
    expect(getKit('nope').id).toBe('house');
  });
});

describe('scheduler', () => {
  // fake AudioContext: currentTime manually advanced
  function fakeCtx(): { ctx: AudioContextLike & { currentTime: number }; scheduled: unknown[] } {
    return {
      ctx: {
        currentTime: 10,
        createOscillator: () => oscillator(),
        createGain: () => gain(),
        createBiquadFilter: () => filter(),
      } as never,
      scheduled: [],
    };
  }
  function oscillator() {
    return {
      type: 'sine',
      frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    };
  }
  function gain() {
    return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  function filter() {
    return { type: 'lowpass', frequency: { value: 0 }, connect() {} };
  }

  it('a playing deck advances position with time', () => {
    const f = fakeCtx();
    const deck = createScheduledDeck(createDeck(120), getKit('house'), 10, {});
    deck.state.playing = true;
    expect(beatPosAt(deck, 10)).toBe(0);
    expect(beatPosAt(deck, 10.5)).toBeCloseTo(1); // half a second = 1 beat at 120
  });

  it('paused deck does not advance', () => {
    const deck = createScheduledDeck(createDeck(120), getKit('house'), 10, {});
    expect(beatPosAt(deck, 11)).toBe(0);
  });

  it('reanchor preserves position across pitch change', () => {
    const deck = createScheduledDeck(createDeck(120), getKit('house'), 10, {});
    deck.state.playing = true;
    const posAtHalf = beatPosAt(deck, 10.5); // = 1 beat
    reanchor(deck, 10.5);
    deck.state.pitchPercent = 6; // now faster
    // at 10.5 + 0.5s more at 127.2 bpm: 1 + 127.2/120*1 = 2.06
    expect(beatPosAt(deck, 11)).toBeCloseTo(posAtHalf + effectiveBpm(deck.state) / 120);
  });

  it('scheduleWindow schedules kick hits and advances the horizon', () => {
    const f = fakeCtx();
    const deck = createScheduledDeck(createDeck(120), getKit('house'), 10, {});
    deck.state.playing = true;
    const n = scheduleWindow(deck, f.ctx, 2); // 2 beats = 8 sixteenth-steps
    // house: kicks on steps 1,5 of the bar -> within 2 beats: 2 kicks (+clap on 5? no, step 5 is beat 2) 
    expect(n).toBeGreaterThanOrEqual(2);
    expect(deck.scheduledUpToBeat).toBeGreaterThanOrEqual(2);
  });

  it('tick returns both positions at currentTime', () => {
    const f = fakeCtx();
    const a = createScheduledDeck(createDeck(120), getKit('house'), 10, {});
    const b = createScheduledDeck(createDeck(120), getKit('house'), 10, {});
    a.state.playing = true;
    b.state.playing = true;
    f.ctx.currentTime = 10.5;
    const { aPos, bPos } = tick(a, b, f.ctx);
    expect(aPos).toBeCloseTo(1);
    expect(bPos).toBeCloseTo(1);
  });
});

describe('pitch bend', () => {
  it('bend changes effective bpm additively with the fader', () => {
    const d = createDeck(120);
    d.pitchPercent = 2;
    setBend(d, 1.5);
    expect(effectiveBpm(d)).toBeCloseTo(120 * 1.035);
  });

  it('release zeroes the bend but keeps the fader and phase', () => {
    const d = createDeck(120);
    d.pitchPercent = 2;
    setBend(d, -1.5);
    nudge(d, 0.3); // phase traveled during the bend hold
    setBend(d, 0); // release
    expect(effectiveBpm(d)).toBeCloseTo(120 * 1.02);
    expect(d.offsetBeats).toBeCloseTo(0.3); // phase kept
    expect(d.bendPercent).toBe(0);
  });
});
