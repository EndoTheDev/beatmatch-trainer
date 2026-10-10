import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScrollWheel } from '../scroll-wheel.directive';
import { Platter } from '../platter/platter';
import { DecimalPipe } from '@angular/common';
import { TrainerService, DeckUiState } from '../trainer.service';

/**
 * One full deck panel: transport, pitch fader, nudge, volume/mute, kit select.
 * Used twice (side = 'A' | 'B').
 */
@Component({
  selector: 'bt-deck-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe, ScrollWheel, Platter],
  template: `
    <section class="deck" [class.deck-a]="side() === 'A'">
      <header class="deck-head">
        <h2>deck {{ side() }}</h2>
        @if (state(); as s) {
          @if (!hideBpm()) {
            <span class="bpm">{{ s.bpm | number: '1.0-1' }} bpm</span>
          } @else {
            <span class="bpm bpm-hidden">--.- bpm</span>
          }
        }
      </header>

      <div class="platter-row">
        <bt-platter [side]="side()" />
        <div class="bpm-big">
          @if (state(); as s) {
            @if (!hideBpm()) {
              {{ s.bpm | number: '1.0-1' }}
            } @else {
              --.-
            }
          }
        </div>
      </div>

      <div class="bpm-row">
        <input
          type="range" min="60" max="200" step="0.5" [value]="state()?.bpm ?? 124"
          class="bpm-slider" btWheel [btWheelStep]="0.5"
          (input)="onBpm($event)" (wheelChange)="onBpmVal($event)"
          [attr.aria-label]="'deck ' + side() + ' tempo, bpm'"
        >
        <span class="bpm-num">{{ state()?.bpm | number: '1.0-1' }}</span>
      </div>

      <div class="transport">
        <button type="button" class="btn play" (click)="play()" [class.active]="state()?.playing">
          {{ state()?.playing ? 'pause' : 'play' }}
        </button>
        <button type="button" class="btn stop" (click)="stop()">stop</button>
        <button type="button" class="btn cue" (click)="cue()">cue</button>
      </div>

      <div class="fader-row">
        <span class="fader-label">-8</span>
        <input
          type="range" min="-8" max="8" step="0.1" [value]="state()?.pitchPercent ?? 0"
          (input)="onPitch($event)" class="pitch-fader"
          [attr.aria-label]="'deck ' + side() + ' pitch fader, percent'"
        >
        <span class="fader-label">+8</span>
        <span class="pitch-value">{{ state()?.pitchPercent ?? 0 >= 0 ? '+' : '' }}{{ state()?.pitchPercent ?? 0 | number: '1.1-1' }}%</span>
      </div>

      <div class="nudge-row">
        <button type="button" class="btn nudge"
          (pointerdown)="bendStart(-1)" (pointerup)="bendEnd()" (pointerleave)="bendEnd()" (pointercancel)="bendEnd()"
          aria-label="drag back - hold to slow down">&#9664; drag</button>
        <span class="nudge-mid">hold to bend</span>
        <button type="button" class="btn nudge"
          (pointerdown)="bendStart(1)" (pointerup)="bendEnd()" (pointerleave)="bendEnd()" (pointercancel)="bendEnd()"
          aria-label="push forward - hold to speed up">push &#9654;</button>
      </div>

      <div class="mix-row">
        <label>
          volume
          <input type="range" min="0" max="1" step="0.01" [value]="state()?.volume ?? 0.8"
            (input)="onVolume($event)" [attr.aria-label]="'deck ' + side() + ' volume'">
        </label>
        <button type="button" class="btn mute" (click)="toggleMute()" [class.active]="state()?.muted">
          {{ state()?.muted ? 'unmute' : 'mute' }}
        </button>
      </div>

      <label class="kit-row">
        kit
        <select [value]="kit()" (change)="onKit($event)">
          @for (k of kits(); track k.id) {
            <option [value]="k.id">{{ k.name }}</option>
          }
        </select>
      </label>
    </section>
  `,
  styles: `
    .deck { border: 1px solid var(--bt-border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; min-width: 0; background: var(--bt-well); box-shadow: inset 0 2px 6px rgba(0,0,0,0.25); }
    .deck-a { border-color: color-mix(in oklab, var(--bt-accent) 45%, var(--bt-border)); }
    header { display: flex; justify-content: space-between; align-items: baseline; }
    h2 { margin: 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .bpm { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 1.05rem; color: var(--bt-accent); text-shadow: 0 0 10px color-mix(in oklab, var(--bt-accent) 40%, transparent); }
    .bpm-hidden { opacity: 0.4; color: var(--bt-fg); text-shadow: none; }
    .bpm-hidden { opacity: 0.4; }
    .platter-row { display: flex; gap: 14px; align-items: center; justify-content: center; padding: 4px 0 2px; }
    .bpm-big { font-size: 2rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--bt-accent); text-shadow: 0 0 14px color-mix(in oklab, var(--bt-accent) 40%, transparent); }
    .bpm-row { display: flex; gap: 10px; align-items: center; }
    .bpm-slider { writing-mode: vertical-lr; direction: rtl; width: 22px; height: 70px; accent-color: var(--bt-accent); }
    .bpm-num { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 1.1rem; color: var(--bt-accent); text-shadow: 0 0 10px color-mix(in oklab, var(--bt-accent) 40%, transparent); }
    .transport { display: flex; gap: 8px; }
    .btn { border: 1px solid var(--bt-border); background: var(--bt-card); color: inherit; border-radius: 8px; padding: 5px 9px; cursor: pointer; font: inherit; font-size: 0.9rem; }
    .btn:hover { border-color: var(--bt-accent); }
    .btn.active { background: var(--bt-accent); color: var(--bt-a-contrast); border-color: var(--bt-accent); box-shadow: 0 0 10px color-mix(in oklab, var(--bt-accent) 35%, transparent); }
    .btn.play { flex: 1; }
    .btn.play.active { animation: bt-pulse 1.6s ease-in-out infinite; }
    @keyframes bt-pulse { 0%, 100% { box-shadow: 0 0 6px color-mix(in oklab, var(--bt-accent) 30%, transparent); } 50% { box-shadow: 0 0 14px color-mix(in oklab, var(--bt-accent) 55%, transparent); } }
    .fader-row { display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: center; }
    .pitch-fader { accent-color: var(--bt-a); }
    .fader-label, .pitch-value { font-size: 0.8rem; opacity: 0.8; font-variant-numeric: tabular-nums; }
    .nudge-row { display: flex; align-items: center; gap: 8px; }
    .nudge-mid { flex: 1; text-align: center; font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.1em; }
    .mix-row { display: flex; gap: 8px; align-items: center; }
    .mix-row label { flex: 1; display: flex; gap: 8px; align-items: center; font-size: 0.85rem; }
    .kit-row { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; }
    select { background: var(--bt-card); color: inherit; border: 1px solid var(--bt-border); border-radius: 8px; padding: 6px 8px; font: inherit; }
    .btn { background: var(--bt-card); }
    .btn:active { transform: translateY(1px); }
    input[type='range'] { flex: 1; }
  `,
})
export class DeckPanel {
  readonly side = input.required<'A' | 'B'>();
  readonly hideBpm = input(false);
  readonly state = input<DeckUiState | null>(null);
  readonly kit = input('');
  readonly kits = input<import('../engine/kits').DrumKit[]>([]);
  readonly pitchChange = output<{ side: 'A' | 'B'; value: number }>();
  readonly bpmChange = output<{ side: 'A' | 'B'; value: number }>();
  readonly onWheelBpm = output<{ side: 'A' | 'B'; value: number }>();
  readonly volumeChange = output<{ side: 'A' | 'B'; value: number }>();
  readonly kitChange = output<{ side: 'A' | 'B'; value: string }>();
  readonly transport = output<{ side: 'A' | 'B'; action: 'play' | 'stop' | 'cue' }>();
  readonly bendStartOut = output<{ side: 'A' | 'B'; direction: 1 | -1 }>();
  readonly bendEndOut = output<'A' | 'B'>();
  readonly muteToggle = output<'A' | 'B'>();

  onBpm(e: Event) { this.bpmChange.emit({ side: this.side(), value: Number((e.target as HTMLInputElement).value) }); }
  onBpmVal(v: number) { this.onWheelBpm.emit({ side: this.side(), value: v }); }
  onPitch(e: Event) { this.pitchChange.emit({ side: this.side(), value: Number((e.target as HTMLInputElement).value) }); }
  onVolume(e: Event) { this.volumeChange.emit({ side: this.side(), value: Number((e.target as HTMLInputElement).value) }); }
  onKit(e: Event) { this.kitChange.emit({ side: this.side(), value: (e.target as HTMLSelectElement).value }); }
  play() { this.transport.emit({ side: this.side(), action: 'play' }); }
  stop() { this.transport.emit({ side: this.side(), action: 'stop' }); }
  cue() { this.transport.emit({ side: this.side(), action: 'cue' }); }
  bendStart(direction: 1 | -1) { this.bendStartOut.emit({ side: this.side(), direction }); }
  bendEnd() { this.bendEndOut.emit(this.side()); }
  toggleMute() { this.muteToggle.emit(this.side()); }
}