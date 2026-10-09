import { Injectable, signal, computed, NgZone } from '@angular/core';
import { DeckState, createDeck, nudge as nudgeDeck, effectiveBpm, phaseDiff, isInPhase } from './engine/deck';
import { KITS, getKit } from './engine/kits';
import { ScheduledDeck, createScheduledDeck, beatPosAt, reanchor, tick, LOOKAHEAD_SECONDS, TICK_INTERVAL_MS } from './engine/scheduler';

export interface DeckUiState {
  bpm: number;
  pitchPercent: number;
  playing: boolean;
  volume: number;
  muted: boolean;
}

/**
 * TrainerService: owns the AudioContext, both decks, and the scheduler loop.
 * UI reads signals; the only Angular-aware part is NgZone (zoneless: signals
 * propagate fine, no zone needed for the raf loop since we only write signals).
 * ponytail: single raf loop drives tick + signal updates; ceiling: signal
 * writes per frame (~60/s) - fine for this UI size.
 */
@Injectable({ providedIn: 'root' })
export class TrainerService {
  readonly deckA = signal<DeckUiState>({ bpm: 124, pitchPercent: 0, playing: false, volume: 0.8, muted: false });
  readonly deckB = signal<DeckUiState>({ bpm: 124, pitchPercent: 0, playing: false, volume: 0.8, muted: false });
  readonly kitA = signal<string>('house');
  readonly kitB = signal<string>('house');
  readonly phaseDiff = signal<number>(0);
  readonly inPhase = signal<boolean>(false);
  readonly kits = KITS;

  /** challenge mode: hide BPM displays, apply hidden offset, sample in-phase */
  readonly challenge = signal<boolean>(false);
  readonly level = signal<number>(1);
  readonly blindMeter = signal<boolean>(false);

  private ctx: AudioContext | null = null;
  private sdA: ScheduledDeck | null = null;
  private sdB: ScheduledDeck | null = null;
  private masterA: GainNode | null = null;
  private masterB: GainNode | null = null;
  private rafId = 0;
  private lastTick = 0;
  private roundSamples: boolean[] = [];
  private roundStart = 0;
  private hiddenOffsetB = 0; // challenge: secret pitch offset on B (percent)

  roundResult = signal<{ percent: number; grade: string; seconds: number } | null>(null);
  readonly roundRunning = signal<boolean>(false);

  constructor(private zone: NgZone) {}

  /** Lazily create the AudioContext on first user gesture (autoplay policy). */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterA = this.ctx.createGain();
      this.masterB = this.ctx.createGain();
      this.masterA.connect(this.ctx.destination);
      this.masterB.connect(this.ctx.destination);
      const now = this.ctx.currentTime;
      const a = createDeck(this.deckA().bpm);
      const b = createDeck(this.deckB().bpm);
      this.sdA = createScheduledDeck(a, getKit(this.kitA()), now, this.masterA);
      this.sdB = createScheduledDeck(b, getKit(this.kitB()), now, this.masterB);
      this.startLoop();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private startLoop(): void {
    const loop = () => {
      const ctx = this.ctx;
      if (!ctx || !this.sdA || !this.sdB) return;
      const { aPos, bPos } = tick(this.sdA, this.sdB, ctx);
      const diff = phaseDiff(aPos, bPos);
      this.phaseDiff.set(diff);
      this.inPhase.set(isInPhase(diff));
      if (this.roundRunning()) {
        this.roundSamples.push(isInPhase(diff));
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  // ---- deck A/B controls (side: 'A' | 'B') ----

  play(side: 'A' | 'B'): void {
    this.ensureContext();
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.deckA : this.deckB;
    if (!sd.state.playing) {
      const now = this.ctx!.currentTime;
      reanchor(sd, now);
      // jump playhead to the cue point if we're at/past it via offset semantics:
      sd.state.playing = true;
      sd.state.offsetBeats = sd.state.cueBeats;
      sd.anchorBeatPos = sd.state.cueBeats;
      sd.anchorTime = now;
      sd.scheduledUpToBeat = sd.state.cueBeats;
      ui.update((s) => ({ ...s, playing: true }));
    }
  }

  pause(side: 'A' | 'B'): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.deckA : this.deckB;
    if (sd.state.playing) {
      reanchor(sd, this.ctx!.currentTime);
      sd.state.playing = false;
      ui.update((s) => ({ ...s, playing: false }));
    }
  }

  stop(side: 'A' | 'B'): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.deckA : this.deckB;
    sd.state.playing = false;
    sd.state.offsetBeats = sd.state.cueBeats;
    sd.anchorBeatPos = sd.state.cueBeats;
    ui.update((s) => ({ ...s, playing: false }));
  }

  /** Cue: tap while playing = set cue at current position. Hold-while-stopped = preview handled by UI. */
  cue(side: 'A' | 'B', atBeat?: number): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    if (sd.state.playing) {
      const now = this.ctx!.currentTime;
      sd.state.cueBeats = Math.floor(beatPosAt(sd, now));
    } else if (atBeat !== undefined) {
      sd.state.cueBeats = atBeat;
    }
  }

  setPitch(side: 'A' | 'B', percent: number): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.deckA : this.deckB;
    if (this.ctx) reanchor(sd, this.ctx.currentTime);
    sd.state.pitchPercent = percent;
    ui.update((s) => ({ ...s, pitchPercent: percent }));
  }

  setBpm(side: 'A' | 'B', bpm: number): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.deckA : this.deckB;
    if (this.ctx) reanchor(sd, this.ctx.currentTime);
    sd.state.bpm = bpm;
    ui.update((s) => ({ ...s, bpm }));
  }

  /** Nudge: push (positive) or drag (negative) deck forward/back in beats. */
  nudge(side: 'A' | 'B', beats: number): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    if (this.ctx) reanchor(sd, this.ctx.currentTime);
    nudgeDeck(sd.state, beats);
    // offsets changed; scheduled window stays valid (we schedule forward only)
    sd.anchorBeatPos += beats;
    sd.scheduledUpToBeat += beats;
  }

  setVolume(side: 'A' | 'B', v: number): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.deckA : this.deckB;
    sd.volume = v;
    ui.update((s) => ({ ...s, volume: v }));
  }

  toggleMute(side: 'A' | 'B'): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.deckA : this.deckB;
    sd.muted = !sd.muted;
    ui.update((s) => ({ ...s, muted: sd.muted }));
  }

  setKit(side: 'A' | 'B', kitId: string): void {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    const ui = side === 'A' ? this.kitA : this.kitB;
    sd.kit = getKit(kitId);
    ui.set(kitId);
  }

  effectiveBpm(side: 'A' | 'B'): number {
    const sd = side === 'A' ? this.sdA! : this.sdB!;
    return effectiveBpm(sd.state);
  }

  // ---- challenge round ----

  startRound(): void {
    this.ensureContext();
    // hidden offset on B scaled by level: reuse ladder to derive gap
    const gap = 0.3 + ((Math.min(10, Math.max(1, this.level())) - 1) / 9) * 1.7;
    this.hiddenOffsetB = (Math.random() < 0.5 ? -1 : 1) * gap;
    // apply secretly (UI shows pitch 0; the engine state carries the offset)
    const sd = this.sdB!;
    if (this.ctx) reanchor(sd, this.ctx.currentTime);
    sd.state.pitchPercent = this.hiddenOffsetB;
    this.roundSamples = [];
    this.roundStart = performance.now();
    this.roundRunning.set(true);
    this.roundResult.set(null);
    // auto-start both decks at the cue
    this.play('A');
    this.play('B');
  }

  endRound(): void {
    this.roundRunning.set(false);
    const seconds = (performance.now() - this.roundStart) / 1000;
    const samples = this.roundSamples;
    const inPhaseCount = samples.filter(Boolean).length;
    const percent = samples.length === 0 ? 0 : (inPhaseCount / samples.length) * 100;
    const grade = percent >= 95 ? 'S' : percent >= 85 ? 'A' : percent >= 70 ? 'B' : percent >= 50 ? 'C' : 'F';
    this.roundResult.set({ percent, grade, seconds });
    // reveal the hidden offset
    const sd = this.sdB!;
    if (this.ctx) reanchor(sd, this.ctx.currentTime);
    sd.state.pitchPercent = this.deckB().pitchPercent;
  }
}