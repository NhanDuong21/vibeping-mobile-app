import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MotionPreferenceStore } from './motion-preference.store';

@Component({
  selector: 'app-animated-percent',
  template: `<span role="img" [attr.aria-label]="value().toFixed(0) + '%'"
    ><span aria-hidden="true">{{ (shown() ?? value()).toFixed(0) }}%</span></span
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimatedPercent {
  readonly value = input.required<number>();
  readonly fresh = input(true);
  readonly #motion = inject(MotionPreferenceStore);
  protected readonly shown = signal<number | null>(null);
  #previous: number | undefined;

  constructor() {
    afterRenderEffect((cleanup) => {
      const target = this.value();
      const enabled = this.#motion.enabled() && this.fresh();
      const from =
        this.#previous === undefined ? undefined : (untracked(this.shown) ?? this.#previous);
      this.#previous = target;
      if (!enabled || from === undefined || from === target || !globalThis.requestAnimationFrame) {
        this.shown.set(target);
        return;
      }
      const start = performance.now();
      let frame = 0;
      const tick = (now: number): void => {
        const progress = Math.min(1, (now - start) / 420);
        this.shown.set(from + (target - from) * (1 - (1 - progress) ** 3));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      cleanup(() => cancelAnimationFrame(frame));
    });
  }
}
