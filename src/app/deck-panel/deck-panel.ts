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

      <div class="face">
        <div class="left-col">
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
          <div class="transport-grid">
            <button type="button" class="btn play" (click)="play()" [class.active]="state()?.playing">
              {{ state()?.playing ? 'pause' : 'play' }}
            </button>
            <button type="button" class="btn" (click)="cue()">cue</button>
            <button type="button" class="btn" (click)="stop()">stop</button>
            <span class="slot" aria-hidden="true"></span>
          </div>
        </div>

        <div class="fader-col">
          <span class="fader-scale top">+8</span>
          <input
            type="range" min="-8" max="8" step="0.1" [value]="state()?.pitchPercent ?? 0"
            (input)="onPitch($event)" class="pitch-fader" btWheel [btWheelStep]="0.1"
            [attr.aria-label]="'deck ' + side() + ' pitch fader, percent'"
          >
          <span class="fader-scale zero">0</span>
          <span class="fader-scale bottom">-8</span>
          <span class="pitch-value">{{ (state()?.pitchPercent ?? 0) >= 0 ? '+' : '' }}{{ state()?.pitchPercent ?? 0 | number: '1.1-1' }}%</span>
        </div>
      </div>

      <div class="bpm-row">
        <span class="row-label">tempo</span>
        <input
          type="range" min="60" max="200" step="0.5" [value]="state()?.bpm ?? 124"
          class="bpm-slider" btWheel [btWheelStep]="0.5"
          (input)="onBpm($event)" (wheelChange)="onBpmVal($event)"
          [attr.aria-label]="'deck ' + side() + ' tempo, bpm'"
        >
        <span class="row-val">{{ state()?.bpm | number: '1.0-1' }}</span>
      </div>

      <div class="bend-row">
        <button type="button" class="btn bend" (pointerdown)="bendStart(-1)" (pointerup)="bendEnd()" (pointerleave)="bendEnd()" (pointercancel)="bendEnd()" aria-label="drag back - hold to slow down">&#9664; drag</button>
        <span class="bend-mid">hold to bend</span>
        <button type="button" class="btn bend" (pointerdown)="bendStart(1)" (pointerup)="bendEnd()" (pointerleave)="bendEnd()" (pointercancel)="bendEnd()" aria-label="push forward - hold to speed up">push &#9654;</button>
      </div>

      <div class="mix-row">
        <span class="row-label">volume</span>
        <input type="range" min="0" max="1" step="0.01" [value]="state()?.volume ?? 0.8"
          (input)="onVolume($event)" btWheel [btWheelStep]="0.02" [attr.aria-label]="'deck ' + side() + ' volume'">
        <button type="button" class="btn mute" (click)="toggleMute()" [class.active]="state()?.muted">
          {{ state()?.muted ? 'unmute' : 'mute' }}
        </button>
      </div>

      <label class="kit-row">
        <span class="row-label">kit</span>
        <select [value]="kit()" (change)="onKit($event)">
          @for (k of kits(); track k.id) {
            <option [value]="k.id">{{ k.name }}</option>
          }
        </select>
      </label>
    </section>
  `,
  styles: `
    .deck { border: 1px solid var(--bt-border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; min-width: 0; background: var(--bt-well); box-shadow: inset 0 2px 6px rgba(0,0,0,0.25); }
    .deck-a { border-color: color-mix(in oklab, var(--bt-accent) 45%, var(--bt-border)); }
    .deck-head { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 4px; border-bottom: 1px solid var(--bt-border); }
    h2 { margin: 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; }
    .bpm { font-variant-numeric: tabular-nums; font-weight: 700; color: var(--bt-accent); text-shadow: 0 0 10px color-mix(in oklab, var(--bt-accent) 40%, transparent); }
    .bpm-hidden { opacity: 0.4; color: var(--bt-fg); text-shadow: none; }

    .face { display: grid; grid-template-columns: 1fr 64px; gap: 12px; align-items: stretch; }
    .left-col { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .bpm-big { font-size: 2rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--bt-accent); text-shadow: 0 0 14px color-mix(in oklab, var(--bt-accent) 40%, transparent); line-height: 1; }
    .transport-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; }
    .slot { border: 1px dashed var(--bt-border); border-radius: 8px; opacity: 0.4; }

    .fader-col { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 4px 0; }
    .fader-scale { font-size: 0.65rem; opacity: 0.55; font-variant-numeric: tabular-nums; }
    .pitch-value { font-size: 0.75rem; opacity: 0.85; font-variant-numeric: tabular-nums; color: var(--bt-accent); margin-top: 2px; }
    .pitch-fader { writing-mode: vertical-lr; direction: rtl; width: 26px; height: 140px; accent-color: var(--bt-accent); }

    .row-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.55; width: 44px; }
    .row-val { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 0.85rem; color: var(--bt-accent); width: 44px; text-align: right; }
    .bpm-row, .mix-row { display: flex; gap: 10px; align-items: center; }
    .bpm-slider, .mix-row input[type='range'] { flex: 1; accent-color: var(--bt-accent); }

    .bend-row { display: flex; align-items: center; gap: 8px; }
    .bend-mid { flex: 1; text-align: center; font-size: 0.68rem; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.12em; }

    .btn { border: 1px solid var(--bt-border); background: var(--bt-card); color: inherit; border-radius: 8px; padding: 7px 10px; cursor: pointer; font: inherit; font-size: 0.88rem; }
    .btn { background: var(--bt-card); }
    .btn:hover { border-color: var(--bt-accent); }
    .btn.active { background: var(--bt-accent); color: var(--bt-a-contrast); border-color: var(--bt-accent); box-shadow: 0 0 10px color-mix(in oklab, var(--bt-accent) 35%, transparent); }
    .btn:active { transform: translateY(1px); }
    .btn.play { grid-column: span 2; }
    .btn.play.active { animation: bt-pulse 1.6s ease-in-out infinite; }
    @keyframes bt-pulse { 0%, 100% { box-shadow: 0 0 6px color-mix(in oklab, var(--bt-accent) 30%, transparent); } 50% { box-shadow: 0 0 14px color-mix(in oklab, var(--bt-accent) 55%, transparent); } }

    .kit-row { display: flex; gap: 10px; align-items: center; }
    select { flex: 1; background: var(--bt-card); color: inherit; border: 1px solid var(--bt-border); border-radius: 8px; padding: 6px 8px; font: inherit; }
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