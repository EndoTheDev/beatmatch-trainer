import { Directive, ElementRef, input, output } from '@angular/core';

/**
 * ScrollWheel: pointer over the host + wheel = adjust a numeric value.
 * ponytail: native <input type=range> ignores the wheel; this directive
 * adds it without a component library. Steps by the range granularity;
 * shift = finer (10% of the step).
 */
@Directive({ selector: 'input[type=range][btWheel]' })
export class ScrollWheel {
  readonly wheelStep = input(0.1, { alias: 'btWheelStep' });
  readonly wheelChange = output<number>();

  private el: HTMLInputElement;

  constructor(ref: ElementRef<HTMLInputElement>) {
    this.el = ref.nativeElement;
    this.el.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const step = this.wheelStep();
      const min = Number(this.el.min) || 0;
      const max = Number(this.el.max) || 100;
      const cur = Number(this.el.value);
      const dir = e.deltaY < 0 ? 1 : -1;
      const next = Math.min(max, Math.max(min, cur + dir * step));
      if (next !== cur) {
        this.el.value = String(next);
        this.el.dispatchEvent(new Event('input'));
        this.wheelChange.emit(next);
      }
    }, { passive: false });
  }
}