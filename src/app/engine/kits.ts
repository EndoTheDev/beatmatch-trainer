/**
 * DrumKit patterns + voice specs for the beatmatch trainer.
 * Pure data: 16 steps per bar, one entry per active voice.
 * ponytail: preset patterns only; upgrade path = v2 step sequencer UI
 * writes this same shape, engine never changes.
 */

export type VoiceName = 'kick' | 'snare' | 'hat' | 'clap';

export interface DrumKit {
  id: string;
  name: string;
  bpm: number; // the kit's natural tempo feel
  /** steps: 1-based step numbers within a 16-step bar where the voice hits */
  pattern: Record<VoiceName, number[]>;
  /** synth params per voice */
  voices: Record<VoiceName, VoiceSpec>;
}

export interface VoiceSpec {
  /** osc frequency in Hz */
  freq: number;
  /** envelope decay in seconds */
  decay: number;
  /** 0..1 */
  gain: number;
  /** filter cutoff in Hz (lowpass), 0 = bypass */
  cutoff?: number;
}

export const KITS: DrumKit[] = [
  {
    id: 'house',
    name: 'house',
    bpm: 124,
    pattern: {
      kick: [1, 5, 9, 13],
      snare: [],
      clap: [5, 13],
      hat: [3, 7, 11, 15],
    },
    voices: {
      kick: { freq: 50, decay: 0.35, gain: 1.0, cutoff: 120 },
      snare: { freq: 190, decay: 0.18, gain: 0.7 },
      clap: { freq: 1100, decay: 0.12, gain: 0.35 },
      hat: { freq: 8000, decay: 0.05, gain: 0.25 },
    },
  },
  {
    id: 'techno',
    name: 'techno',
    bpm: 130,
    pattern: {
      kick: [1, 5, 9, 13],
      snare: [5, 13],
      clap: [],
      hat: [3, 4, 7, 11, 12, 15],
    },
    voices: {
      kick: { freq: 55, decay: 0.3, gain: 1.0, cutoff: 100 },
      snare: { freq: 210, decay: 0.15, gain: 0.6 },
      clap: { freq: 1000, decay: 0.1, gain: 0.3 },
      hat: { freq: 9000, decay: 0.04, gain: 0.22 },
    },
  },
  {
    id: 'hiphop',
    name: 'hip hop',
    bpm: 92,
    pattern: {
      kick: [1, 8, 11],
      snare: [5, 13],
      clap: [],
      hat: [3, 7, 10, 15],
    },
    voices: {
      kick: { freq: 48, decay: 0.4, gain: 1.0, cutoff: 90 },
      snare: { freq: 180, decay: 0.2, gain: 0.8 },
      clap: { freq: 900, decay: 0.12, gain: 0.3 },
      hat: { freq: 7000, decay: 0.06, gain: 0.2 },
    },
  },
  {
    id: 'dnb',
    name: 'drum & bass',
    bpm: 174,
    pattern: {
      kick: [1, 11],
      snare: [5, 13],
      clap: [13],
      hat: [3, 7, 9, 11, 15],
    },
    voices: {
      kick: { freq: 60, decay: 0.25, gain: 1.0, cutoff: 110 },
      snare: { freq: 200, decay: 0.14, gain: 0.75 },
      clap: { freq: 1200, decay: 0.08, gain: 0.28 },
      hat: { freq: 9500, decay: 0.03, gain: 0.2 },
    },
  },
];

export function getKit(id: string): DrumKit {
  return KITS.find((k) => k.id === id) ?? KITS[0];
}