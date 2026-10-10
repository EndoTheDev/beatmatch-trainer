import { Component, inject, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { TrainerService } from '../trainer.service';

/**
 * Spinning platter: rotates with the deck's beat position, so its speed
 * reflects the REAL effective bpm (fader + bend included). Paused = frozen.
 * The marker dot makes rotation readable; two platters side by side make
 * tempo-matching visually obvious.
 */
@Component({
  selector: 'bt-platter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div
      class="platter"
      [class.spinning]="playing()"
      [attr.aria-label]="'deck ' + side() + ' platter'"
    >
      <div class="disc" [style.transform]="'rotate(' + angle() + 'deg)'">
        <span class="marker"></span>
      </div>
    </div>
  `,
  styles: `
    .platter { width: 90px; height: 90px; flex-shrink: 0; }
    .disc {
      position: relative; width: 100%; height: 100%;
      border-radius: 50%;
      background:
        radial-gradient(circle at 50% 50%, var(--bt-card) 0%, var(--bt-well) 62%, var(--bt-block-off) 100%);
      border: 2px solid var(--bt-border);
      box-shadow: inset 0 0 18px rgba(0,0,0,0.45);
      will-change: transform;
    }
    .marker {
      position: absolute; top: 6px; left: 50%; width: 10px; height: 10px;
      margin-left: -5px; border-radius: 50%;
      background: var(--bt-accent);
      box-shadow: 0 0 10px color-mix(in oklab, var(--bt-accent) 60%, transparent);
    }
  `,
})
export class Platter {
  readonly side = input.required<'A' | 'B'>();
  readonly trainer = inject(TrainerService);

  readonly playing = computed(() =>
    this.side() === 'A' ? this.trainer.deckA().playing : this.trainer.deckB().playing,
  );

  /** platter angle = beat position * 360; speed follows effective bpm via pos growth */
  readonly angle = computed(() => {
    const pos = this.side() === 'A' ? this.trainer.deckAPos() : this.trainer.deckBPos();
    // one revolution per beat makes the rotation read as "the beat" itself
    return ((pos % 1) * 360).toFixed(1);
  });
}