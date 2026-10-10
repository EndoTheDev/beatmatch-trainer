import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { TrainerService } from '../trainer.service';

/**
 * Traktor-style beat phase meter: a single horizontal bar showing the
 * phase DIFFERENCE directly - a marker sweeps within +-0.5 beats, dead
 * center = locked. Opposite philosophy from the Pioneer display:
 * Pioneer shows bar position per deck, this shows the exact distance.
 */
@Component({
  selector: 'bt-traktor-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="traktor" [attr.aria-label]="'phase difference ' + trainer.phaseDiff() + ' beats'">
      <div class="scale">
        <span class="tick left">-&#189;</span>
        <span class="tick center">0</span>
        <span class="tick right">+&#189;</span>
      </div>
      <div class="track">
        <div class="zone" [class.hit]="trainer.inPhase()"></div>
        <div class="marker" [style.left.%]="markerPos()"></div>
        <div class="centerline"></div>
      </div>
    </div>
  `,
  styles: `
    .traktor { margin: 8px 0 12px; padding: 10px 14px; border: 1px solid var(--bt-border); border-radius: 10px; background: var(--bt-well); }
    .scale { display: flex; justify-content: space-between; font-size: 0.7rem; opacity: 0.55; margin-bottom: 6px; }
    .track { position: relative; height: 16px; border-radius: 8px; background: var(--bt-block-off); overflow: visible; }
    .zone { position: absolute; left: 45%; width: 10%; top: 0; bottom: 0; border-radius: 8px; background: color-mix(in oklab, var(--bt-ok) 18%, transparent); transition: background 100ms; }
    .zone.hit { background: color-mix(in oklab, var(--bt-ok) 45%, transparent); }
    .marker { position: absolute; top: -3px; bottom: -3px; width: 10px; margin-left: -5px; border-radius: 3px; background: var(--bt-accent); box-shadow: 0 0 8px color-mix(in oklab, var(--bt-accent) 50%, transparent); transition: left 60ms linear; }
    .centerline { position: absolute; left: 50%; top: -6px; bottom: -6px; width: 2px; margin-left: -1px; background: var(--bt-fg); opacity: 0.5; }
  `,
})
export class TraktorMeter {
  readonly trainer = inject(TrainerService);
  readonly markerPos = computed(() => 50 + (this.trainer.phaseDiff() / 0.5) * 45);
}