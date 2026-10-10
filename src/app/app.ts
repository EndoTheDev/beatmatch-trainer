import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
        <div>
          <h1>beatmatch trainer</h1>
          <p class="sub">two decks, your ears, no sync button.</p>
        </div>
        <button type="button" class="btn theme" (click)="cycleTheme()" [attr.aria-label]="'theme: ' + theme()">
          {{ theme() }}
        </button>
      </header>

      <nav class="meta-row">
        <label class="rate">
          bend rate {{ trainer.bendRate() | number: '1.1-1' }}%/s
          <input type="range" min="0.5" max="4" step="0.1" [value]="trainer.bendRate()"
            (input)="onBendRate($event)" aria-label="bend rate, percent per second">
        </label>
      </nav>

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
          (bendStartOut)="onBendStart($event)"
          (bendEndOut)="onBendEnd($event)"
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
          (bendStartOut)="onBendStart($event)"
          (bendEndOut)="onBendEnd($event)"
          (muteToggle)="onMute($event)"
        />
      </div>

      <footer class="foot">
        <p>challenge mode gives deck B a hidden tempo offset - match it by ear, fader, and nudge. grades: S 95% / A 85% / B 70% / C 50% time in phase.</p>
      </footer>
    </main>
  `,
  styles: `
    :host {
      --bt-fg: #e6e2dc; --bt-accent: #e8833a; --bt-accent-dim: #8a4e23; --bt-a: var(--bt-accent);
      --bt-a-contrast: #1a1512; --bt-ok: #4ec96b;
      --bt-border: #35312b; --bt-card: #232019; --bt-well: #1a1712; --bt-block-off: #2c2822;
      --bt-bg: #12100c;
      font-family: system-ui, sans-serif;
    }
    @media (prefers-color-scheme: light) {
      :host:not(.bt-dark) {
        --bt-fg: #2a2520; --bt-accent: #d06a1e; --bt-accent-dim: #b8895f; --bt-a: var(--bt-accent);
        --bt-a-contrast: #fff; --bt-ok: #2e9e4a;
        --bt-border: #d8d2c8; --bt-card: #f2efe9; --bt-well: #e4dfd5; --bt-block-off: #d0c9bc;
        --bt-bg: #faf8f4;
      }
    }
    :host.bt-light {
      --bt-fg: #2a2520; --bt-accent: #d06a1e; --bt-accent-dim: #b8895f; --bt-a: var(--bt-accent);
      --bt-a-contrast: #fff; --bt-ok: #2e9e4a;
      --bt-border: #d8d2c8; --bt-card: #f2efe9; --bt-well: #e4dfd5; --bt-block-off: #d0c9bc;
      --bt-bg: #faf8f4;
    }
    :host.bt-dark {
      --bt-fg: #e6e2dc; --bt-accent: #e8833a; --bt-accent-dim: #8a4e23; --bt-a: var(--bt-accent);
      --bt-a-contrast: #1a1512; --bt-ok: #4ec96b;
      --bt-border: #35312b; --bt-card: #232019; --bt-well: #1a1712; --bt-block-off: #2c2822;
      --bt-bg: #12100c;
    }
    :host { display: block; min-height: 100vh; background: var(--bt-bg); color: var(--bt-fg); font-family: system-ui, sans-serif; }
    .wrap { max-width: 780px; margin: 0 auto; padding: 20px 16px 40px; }
    :host { background: var(--bt-bg); }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .head h1 { margin: 0 0 2px; font-size: 1.5rem; letter-spacing: 0.02em; }
    .theme { text-transform: capitalize; }
    .sub { margin: 0 0 16px; opacity: 0.6; font-size: 0.9rem; }
    .meta-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
    .mode-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
    .rate { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; }
    .rate input { accent-color: var(--bt-a); width: 120px; }
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
  readonly theme = signal<'auto' | 'light' | 'dark'>(
    (localStorage.getItem('bt-theme') as 'auto' | 'light' | 'dark') ?? 'auto',
  );

  constructor() {
    this.applyTheme(this.theme());
  }

  cycleTheme() {
    const order = ['auto', 'light', 'dark'] as const;
    const next = order[(order.indexOf(this.theme()) + 1) % order.length];
    this.theme.set(next);
    localStorage.setItem('bt-theme', next);
    this.applyTheme(next);
  }

  private applyTheme(t: 'auto' | 'light' | 'dark') {
    const doc = document.documentElement;
    doc.classList.toggle('bt-light', t === 'light');
    doc.classList.toggle('bt-dark', t === 'dark');
    doc.style.colorScheme = t === 'auto' ? 'light dark' : t;
  }

  onBendRate(e: Event) { this.trainer.setBendRate(Number((e.target as HTMLInputElement).value)); }
  onBendStart(e: { side: 'A' | 'B'; direction: 1 | -1 }) { this.trainer.bendStart(e.side, e.direction); }
  onBendEnd(side: 'A' | 'B') { this.trainer.bendEnd(side); }

  setMode(challenge: boolean) {
    this.trainer.challenge.set(challenge);
    if (!challenge) this.trainer.roundRunning.set(false);
  }

  onLevel(e: Event) { this.trainer.level.set(Number((e.target as HTMLInputElement).value)); }

  onPitch(e: { side: 'A' | 'B'; value: number }) { this.trainer.setPitch(e.side, e.value); }
  onVolume(e: { side: 'A' | 'B'; value: number }) { this.trainer.setVolume(e.side, e.value); }
  onKit(e: { side: 'A' | 'B'; value: string }) { this.trainer.setKit(e.side, e.value); }
  onMute(side: 'A' | 'B') { this.trainer.toggleMute(side); }

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