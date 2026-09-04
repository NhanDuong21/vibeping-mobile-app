import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MotionPreferenceStore } from '../../../core/motion/motion-preference.store';
import { ambientMotion, mascotState, reactionMotion } from '../application/mascot-motion';

@Component({
  selector: 'app-mascot-companion',
  template: `<span
    class="relative grid size-12 shrink-0 place-items-center"
    aria-hidden="true"
    [attr.data-mascot-state]="state()"
  >
    <span
      #ring
      class="pointer-events-none absolute inset-0 rounded-full border border-vibe-mint opacity-0"
      [class.border-vibe-amber!]="state() === 'waiting'"
      [class.border-vibe-coral!]="state() === 'failed'"
      [class.opacity-30]="state() === 'working' || state() === 'waiting' || state() === 'offline'"
      [class.border-dashed]="state() === 'offline'"
    ></span>
    <svg
      #sparkles
      class="pointer-events-none absolute inset-0 size-12 text-vibe-mint opacity-0"
      viewBox="0 0 48 48"
      fill="currentColor"
    >
      <circle cx="6" cy="16" r="1.5" />
      <circle cx="25" cy="5" r="2" />
      <circle cx="42" cy="13" r="1.5" />
    </svg>
    <span #body class="relative block size-10">
      <img
        #cat
        src="/assets/logo-icon-192.png"
        srcset="/assets/logo-icon-192.png 192w, /assets/logo-icon-512.png 512w"
        sizes="40px"
        width="40"
        height="40"
        alt=""
        class="size-10 object-contain transition-[filter,opacity] duration-500 motion-reduce:transition-none"
        [class.grayscale]="state() === 'offline'"
        [class.opacity-60]="state() === 'offline'"
      />
    </span>
    @if (state() === 'completed' || state() === 'failed' || state() === 'waiting') {
      <svg
        class="absolute -right-1 bottom-0 size-4 rounded-full bg-vibe-canvas text-vibe-green dark:bg-vibe-night dark:text-vibe-mint"
        [class.text-red-700!]="state() === 'failed'"
        [class.dark:text-vibe-coral!]="state() === 'failed'"
        [class.text-amber-800!]="state() === 'waiting'"
        [class.dark:text-vibe-amber!]="state() === 'waiting'"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        @switch (state()) {
          @case ('completed') {
            <path d="m3 8 3 3 7-7" />
          }
          @case ('failed') {
            <path d="m4 4 8 8m0-8-8 8" />
          }
          @case ('waiting') {
            <path d="M8 3v6m0 3h.01" />
          }
        }
      </svg>
    }
    @if (coffee()) {
      <svg
        class="absolute -right-2 bottom-0 size-4 text-vibe-muted dark:text-vibe-sage"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      >
        <path d="M3 8h10v5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Zm10 1h2a2 2 0 0 1 0 4h-2M6 5V2m4 3V2" />
      </svg>
    }
  </span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MascotCompanion {
  readonly kind = input.required<string>();
  readonly reaction = input<unknown>(null);
  readonly startedAt = input<string | null | undefined>(null);
  readonly now = input.required<Date>();
  readonly state = computed(() => mascotState(this.kind()));
  readonly coffee = computed(() => {
    const start = this.startedAt();
    return (
      this.state() === 'working' &&
      !!start &&
      this.now().getTime() - Date.parse(start) > 30 * 60_000
    );
  });
  readonly #preferences = inject(MotionPreferenceStore);
  readonly #host = inject(ElementRef<HTMLElement>).nativeElement;
  readonly #inView = signal(true);
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  private readonly cat = viewChild<ElementRef<HTMLElement>>('cat');
  private readonly ring = viewChild<ElementRef<HTMLElement>>('ring');
  private readonly sparkles = viewChild<ElementRef<SVGElement>>('sparkles');
  #lastReaction: unknown = null;
  #previousState = '';
  #initialized = false;

  constructor() {
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => this.#inView.set(entry.isIntersecting));
    observer?.observe(this.#host);
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
    afterRenderEffect((cleanup) => {
      const state = this.state();
      const enabled = this.#preferences.enabled() && this.#inView();
      const full = this.#preferences.effective() === 'full';
      const ambient = ambientMotion(state);
      if (!enabled || !full || !ambient) return;
      const breathing = this.body()?.nativeElement.animate?.(ambient.frames, {
        duration: ambient.duration,
        iterations: Infinity,
        easing: 'ease-in-out',
      });
      const ring =
        state === 'working'
          ? this.ring()?.nativeElement.animate?.(
              [
                { transform: 'scale(0.85)', opacity: 0.35 },
                { transform: 'scale(1.12)', opacity: 0 },
              ],
              { duration: 3200, iterations: Infinity, easing: 'ease-out' },
            )
          : undefined;
      cleanup(() => {
        breathing?.cancel();
        ring?.cancel();
      });
    });
    afterRenderEffect((cleanup) => {
      const key = this.reaction();
      const state = this.state();
      const visible = this.#preferences.enabled() && this.#inView();
      const changed = !!key && key !== this.#lastReaction;
      const reconnected = this.#previousState === 'offline' && state !== 'offline';
      const react = this.#initialized && (changed || reconnected);
      this.#lastReaction = key;
      this.#previousState = state;
      this.#initialized = true;
      if (!visible || !react) return;
      const full = this.#preferences.effective() === 'full';
      const animation = this.cat()?.nativeElement.animate?.(
        full ? reactionMotion(state) : [{ opacity: 0.65 }, { opacity: 1 }],
        { duration: state === 'failed' ? 280 : 620, easing: 'cubic-bezier(0.16,1,0.3,1)' },
      );
      const burst = full
        ? this.ring()?.nativeElement.animate?.(
            [
              { transform: 'scale(0.7)', opacity: 0.65 },
              { transform: 'scale(1.5)', opacity: 0 },
            ],
            { duration: 700, easing: 'ease-out' },
          )
        : undefined;
      const sparks =
        full && state === 'completed'
          ? this.sparkles()?.nativeElement.animate?.(
              [
                { opacity: 0, transform: 'translateY(3px)' },
                { opacity: 1, offset: 0.2 },
                { opacity: 0, transform: 'translateY(-10px)' },
              ],
              { duration: 900, easing: 'ease-out' },
            )
          : undefined;
      cleanup(() => {
        animation?.cancel();
        burst?.cancel();
        sparks?.cancel();
      });
    });
  }
}
