import { afterRenderEffect, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { MotionPreferenceStore } from './motion-preference.store';
import { MOTION_EASE, MOTION_FRAMES, type MotionCue } from './motion-presets';

/** One interruptible cue per changed key. Offscreen/background cues are consumed, never replayed. */
@Directive({ selector: '[appSignalMotion]' })
export class SignalMotion {
  readonly appSignalMotion = input<MotionCue>('arrive');
  readonly motionKey = input<unknown>('entrance');
  readonly motionDelay = input(0);
  readonly #host = inject(ElementRef<HTMLElement>).nativeElement;
  readonly #preferences = inject(MotionPreferenceStore);
  #lastKey: unknown = Symbol('not-rendered');

  constructor() {
    afterRenderEffect((cleanup) => {
      const key = this.motionKey();
      const cue = this.appSignalMotion();
      const enabled = this.#preferences.enabled();
      if (key === this.#lastKey) return;
      this.#lastKey = key;
      const rect = this.#host.getBoundingClientRect();
      if (
        !key ||
        !enabled ||
        rect.bottom <= 0 ||
        rect.top >= innerHeight ||
        this.#host.closest('.ion-page-hidden')
      )
        return;
      const frames =
        this.#preferences.effective() === 'balanced'
          ? [{ opacity: 0.6 }, { opacity: 1 }]
          : MOTION_FRAMES[cue];
      const animation = this.#host.animate?.(frames, {
        duration: cue === 'success' ? 760 : cue === 'failure' ? 240 : 460,
        delay: Math.min(this.motionDelay(), 240),
        easing: MOTION_EASE,
      });
      cleanup(() => animation?.cancel());
    });
  }
}

/** Pause the subtree's CSS loops outside the viewport, including cached Ionic pages. */
@Directive({ selector: '[appMotionInView]' })
export class MotionInView {
  constructor() {
    const element = inject(ElementRef<HTMLElement>).nativeElement;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset['motionOffscreen'] = String(!entry.isIntersecting);
    });
    observer.observe(element);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
