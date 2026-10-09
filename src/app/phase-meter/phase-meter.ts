import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { TrainerService } from '../trainer.service';

@Component({
  selector: 'bt-phase-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="meter" [attr.aria-label]="'phase difference ' + diff() + ' beats'">
      <div class="track">
        <div class="marker" [style.left.%]="markerPos()"></div>
      </div>
      <div class="center-notch"></div>
    </div>
  `,
  styles: `
    .meter { position: relative; height: 18px; margin: 8px 0; }
    .track { position: absolute; inset: 0; border: 1px solid var(--bt-border); border-radius: 9px; background: var(--bt-card); overflow: hidden; }
    .marker { position: absolute; top: 0; bottom: 0; width: 14px; margin-left: -7px; border-radius: 4px; background: var(--bt-a); transition: left 60ms linear; }
    .center-notch { position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; background: var(--bt-fg); opacity: 0.6; }
  `,
})
export class PhaseMeter {
  readonly trainer = inject(TrainerService);
  readonly diff = this.trainer.phaseDiff;
  readonly markerPos = computed(() => 50 + (this.diff() / 0.5) * 45);
}