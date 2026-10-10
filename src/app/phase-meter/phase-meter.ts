import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { TrainerService } from '../trainer.service';

/**
 * Pioneer CDJ-style beat phase display: two rows of 4 blocks (quarter-beat
 * resolution), one row per deck. Each row sweeps independently; when the
 * decks are locked, both rows flash in perfect sync. Drift direction is
 * readable as the leading row glowing while the lagging row dims.
 */
@Component({
  selector: 'bt-phase-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="pioneer" [attr.aria-label]="'beat phase, difference ' + trainer.phaseDiff() + ' beats'">
      @for (row of rows(); track row.deck) {
        <div class="row">
          <span class="tag">{{ row.deck }}</span>
          <span class="blocks" [class.leading]="row.leading" [class.inphase]="trainer.inPhase()">
            @for (lit of row.lit; track $index) {
              <span class="block" [class.on]="lit"></span>
            }
          </span>
        </div>
      }
    </div>
  `,
  styles: `
    .pioneer { display: flex; flex-direction: column; gap: 6px; margin: 10px 0 14px; padding: 12px 14px; border: 1px solid var(--bt-border); border-radius: 10px; background: var(--bt-well); }
    .row { display: flex; align-items: center; gap: 12px; }
    .tag { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; opacity: 0.55; width: 14px; }
    .blocks { display: flex; gap: 6px; flex: 1; }
    .block { flex: 1; height: 14px; border-radius: 3px; background: var(--bt-block-off); transition: background 60ms linear, box-shadow 60ms linear; }
    .block.on { background: var(--bt-accent); box-shadow: 0 0 8px color-mix(in oklab, var(--bt-accent) 55%, transparent); }
    .inphase .block.on { background: var(--bt-ok); box-shadow: 0 0 10px color-mix(in oklab, var(--bt-ok) 60%, transparent); }
    .leading .block.on { background: var(--bt-accent); }
    .blocks:not(.leading) .block.on { opacity: 0.75; }
  `,
})
export class PhaseMeter {
  readonly trainer = inject(TrainerService);

  /**
   * Two rows, each sweeping its 4 blocks per beat of its own deck.
   * ponytail: computed re-evaluates whenever the service's position signals
   * change (every rAF tick while decks run). Lit blocks as plain booleans.
   */
  readonly rows = computed(() => {
    const diff = this.trainer.phaseDiff();
    const aPos = this.trainer.deckAPos();
    const bPos = this.trainer.deckBPos();
    const bAhead = diff > 0;
    return [this.mkRow('A', aPos, !bAhead), this.mkRow('B', bPos, bAhead)];
  });

  private mkRow(deck: string, pos: number, leading: boolean) {
    // one block = one BEAT; the row lights the current beat-in-bar (1..4 cycle)
    const active = Math.floor(pos) % 4;
    const lit = [0, 1, 2, 3].map((i) => i === active);
    return { deck, lit, leading };
  }
}