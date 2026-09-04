import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { MotionPreferenceStore } from '../../../core/motion/motion-preference.store';

@Component({
  selector: 'app-session-working-signal',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `<span
    class="inline-flex h-6 w-6 items-center justify-center gap-1 text-vibe-green dark:text-vibe-mint"
  >
    <span class="h-2 w-0.5 rounded-full bg-current"></span>
    <span class="h-4 w-0.5 rounded-full bg-current"></span>
    <span class="h-3 w-0.5 rounded-full bg-current"></span>
  </span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionWorkingSignal {
  readonly #host: HTMLElement = inject(ElementRef).nativeElement;
  readonly #motion = inject(MotionPreferenceStore);
  readonly #inView = signal(false);

  constructor() {
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => this.#inView.set(entry.isIntersecting));
    observer?.observe(this.#host);
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
    afterRenderEffect((cleanup) => {
      if (!this.#motion.enabled() || this.#motion.effective() !== 'full' || !this.#inView()) return;
      const animations = Array.from(this.#host.querySelectorAll('span > span')).map((bar, index) =>
        bar.animate?.(
          [
            { transform: 'scaleY(0.55)', opacity: 0.5 },
            { transform: 'scaleY(1)', opacity: 1, offset: 0.4 },
            { transform: 'scaleY(0.55)', opacity: 0.5 },
          ],
          { duration: 2400, delay: index * -240, iterations: Infinity, easing: 'ease-in-out' },
        ),
      );
      cleanup(() => animations.forEach((animation) => animation?.cancel()));
    });
  }
}
