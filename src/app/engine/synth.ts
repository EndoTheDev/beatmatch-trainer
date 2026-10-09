/**
 * Synth: drum voice synthesis on a Web Audio context.
 * Each voice = sine/triangle burst with an exponential decay envelope.
 * ponytail: hand-rolled drum synthesis, deliberately simple; upgrade path =
 * layered oscillators + noise buffer if the kits need more character.
 */

import { DrumKit, VoiceName, VoiceSpec } from './kits';

export interface AudioContextLike {
  currentTime: number;
  createOscillator(): OscillatorNodeLike;
  createGain(): GainNodeLike;
  createBiquadFilter(): BiquadFilterNodeLike;
}

export interface OscillatorNodeLike {
  type: string;
  frequency: { value: number; setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
  connect(node: unknown): void;
  start(t: number): void;
  stop(t: number): void;
}

export interface GainNodeLike {
  gain: { value: number; setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
  connect(node: unknown): void;
}

export interface BiquadFilterNodeLike {
  type: string;
  frequency: { value: number };
  connect(node: unknown): void;
}

/** Schedule one voice hit at absolute AudioContext time t. */
export function triggerVoice(
  ctx: AudioContextLike,
  voice: VoiceSpec,
  when: number,
  dest: unknown,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = voice.freq < 200 ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(voice.freq, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, voice.freq * 0.4), when + voice.decay);

  gain.gain.setValueAtTime(voice.gain * volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + voice.decay);

  let tail: unknown = gain;
  osc.connect(gain);

  if (voice.cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = voice.cutoff;
    gain.connect(filter);
    tail = filter;
  }

  (tail as GainNodeLike).connect(dest);
  osc.start(when);
  osc.stop(when + voice.decay + 0.05);
}

/** Schedule a full kit step (all voices hitting on this 16th-step). */
export function triggerStep(
  ctx: AudioContextLike,
  kit: DrumKit,
  voices: VoiceName[],
  when: number,
  dest: unknown,
  volume: number,
): void {
  for (const v of voices) {
    const spec = kit.voices[v];
    if (spec) triggerVoice(ctx, spec, when, dest, volume);
  }
}

/** Which kit voices hit on a given 16th step (1-based). */
export function voicesOnStep(kit: DrumKit, step: number): VoiceName[] {
  const out: VoiceName[] = [];
  (Object.keys(kit.pattern) as VoiceName[]).forEach((v) => {
    if (kit.pattern[v].includes(step)) out.push(v);
  });
  return out;
}