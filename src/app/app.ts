import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TrainerService } from './trainer.service';
import { DeckPanel } from './deck-panel/deck-panel';
import { PhaseMeter } from './phase-meter/phase-meter';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DeckPanel, PhaseMeter, DecimalPipe],
  template: `
    <main class="wrap">
      <header class="head">
        <h1>beatmatch trainer</h1>
        <p class="sub">two decks, your ears, no sync button.</p>
      </header>

      <nav class="mode-row">
        <button type="button" class="btn" [class.active]="!trainer.challenge()" (click)="setMode(false)">practice</button>
        <button type="button" class="btn" [class.active]="trainer.challenge()" (click)="setMode(true)">challenge</button>
        @if (trainer.challenge()) {
          <label class="level">
            level {{ trainer.level() }}
            <input type="range" min="1" max="10" step="1" [value]="trainer.level()"
              (input)="onLevel($event)" aria-label="difficulty level">
          </label>
          @if (!trainer.roundRunning()) {
            <button type="button" class="btn start" (click)="trainer.startRound()">start round</button>
          } @else {
            <button type="button" class="btn" (click)="trainer.endRound()">end round</button>
          }
          <button type="button" class="btn" [class.active]="trainer.blindMeter()" (click)="trainer.blindMeter.set(!trainer.blindMeter())">
            {{ trainer.blindMeter() ? 'meter hidden' : 'meter shown' }}
          </button>
        }
      </nav>

      @if (trainer.roundResult(); as r) {
        <section class="result" aria-live="polite">
          <span class="grade" [attr.data-grade]="r.grade">{{ r.grade }}</span>
          <span class="percent">{{ r.percent | number: '1.0-1' }}% in phase</span>
          <span class="time">{{ r.seconds | number: '1.0-0' }}s</span>
        </section>
      }

      @if (!trainer.blindMeter()) {
        <bt-phase-meter />
      }

      <div class="decks">
        <bt-deck-panel
          side="A"
          [state]="trainer.deckA()"
          [kit]="trainer.kitA()"
          [kits]="trainer.kits"
          [hideBpm]="trainer.challenge()"
          (pitchChange)="onPitch($event)"
          (volumeChange)="onVolume($event)"
          (kitChange)="onKit($event)"
          (transport)="onTransport($event)"
          (nudgeOut)="onNudge($event)"
          (muteToggle)="onMute($event)"
        />
        <bt-deck-panel
          side="B"
          [state]="trainer.deckB()"
          [kit]="trainer.kitB()"
          [kits]="trainer.kits"
          [hideBpm]="trainer.challenge()"
          (pitchChange)="onPitch($event)"
          (volumeChange)="onVolume($event)"
          (kitChange)="onKit($event)"
          (transport)="onTransport($event)"
          (nudgeOut)="onNudge($event)"
          (muteToggle)="onMute($event)"
        />
      </div>

      <footer class="foot">
        <p>challenge mode gives deck B a hidden tempo offset - match it by ear, fader, and nudge. grades: S 95% / A 85% / B 70% / C 50% time in phase.</p>
      </footer>
    </main>
  `,
  styles: `
    :host { --bt-fg: #e8e8e8; --bt-a: #c96f4a; --bt-a-contrast: #1a1a1a; --bt-border: #3a3a3a; --bt-card: #232323; --bt-bg: #141414; }
    @media (prefers-color-scheme: light) {
      :host { --bt-fg: #1a1a1a; --bt-a: #b85c38; --bt-a-contrast: #fff; --bt-border: #ccc; --bt-card: #f5f5f5; --bt-bg: #fafafa; }
    }
    :host { display: block; min-height: 100vh; background: var(--bt-bg); color: var(--bt-fg); font-family: system-ui, sans-serif; }
    .wrap { max-width: 780px; margin: 0 auto; padding: 20px 16px 40px; }
    .head h1 { margin: 0 0 2px; font-size: 1.5rem; letter-spacing: 0.02em; }
    .sub { margin: 0 0 16px; opacity: 0.6; font-size: 0.9rem; }
    .mode-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
    .btn { border: 1px solid var(--bt-border); background: var(--bt-card); color: inherit; border-radius: 8px; padding: 7px 12px; cursor: pointer; font: inherit; }
    .btn:hover { border-color: var(--bt-a); }
    .btn.active, .btn.start { background: var(--bt-a); color: var(--bt-a-contrast); border-color: var(--bt-a); }
    .level { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; }
    .level input { accent-color: var(--bt-a); }
    .result { display: flex; gap: 14px; align-items: center; padding: 10px 14px; border: 1px solid var(--bt-border); border-radius: 10px; margin-bottom: 10px; }
    .grade { font-size: 1.6rem; font-weight: 700; }
    .grade[data-grade='S'] { color: #e5c07b; } .grade[data-grade='A'] { color: #98c379; }
    .grade[data-grade='B'] { color: #61afef; } .grade[data-grade='C'] { color: #e06c75; } .grade[data-grade='F'] { color: #888; }
    .percent { font-variant-numeric: tabular-nums; }
    .time { opacity: 0.6; font-variant-numeric: tabular-nums; }
    .decks { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 640px) { .decks { grid-template-columns: 1fr; } }
    .foot { margin-top: 18px; font-size: 0.8rem; opacity: 0.55; line-height: 1.5; }
  `,
})
export class App {
  readonly trainer = inject(TrainerService);

  setMode(challenge: boolean) {
    this.trainer.challenge.set(challenge);
    if (!challenge) this.trainer.roundRunning.set(false);
  }

  onLevel(e: Event) { this.trainer.level.set(Number((e.target as HTMLInputElement).value)); }

  onPitch(e: { side: 'A' | 'B'; value: number }) { this.trainer.setPitch(e.side, e.value); }
  onVolume(e: { side: 'A' | 'B'; value: number }) { this.trainer.setVolume(e.side, e.value); }
  onKit(e: { side: 'A' | 'B'; value: string }) { this.trainer.setKit(e.side, e.value); }
  onMute(side: 'A' | 'B') { this.trainer.toggleMute(side); }
  onNudge(e: { side: 'A' | 'B'; beats: number }) { this.trainer.nudge(e.side, e.beats); }

  onTransport(e: { side: 'A' | 'B'; action: 'play' | 'stop' | 'cue' }) {
    if (e.action === 'play') {
      const s = e.side === 'A' ? this.trainer.deckA() : this.trainer.deckB();
      s.playing ? this.trainer.pause(e.side) : this.trainer.play(e.side);
    } else if (e.action === 'stop') {
      this.trainer.stop(e.side);
    } else {
      this.trainer.cue(e.side);
    }
  }
}