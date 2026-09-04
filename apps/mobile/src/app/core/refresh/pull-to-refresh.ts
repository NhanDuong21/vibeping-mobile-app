import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  InjectionToken,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

type PullPhase = 'idle' | 'pulling' | 'armed' | 'refreshing';

const ARM_DISTANCE_PX = 104;
const MAX_OFFSET_PX = 64;
const RELOAD_DELAY_MS = 160;
const PULL_RESISTANCE = 0.52;
const IGNORED_TARGETS = 'input, textarea, select, [contenteditable="true"], [data-refresh-ignore]';

export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => () => globalThis.location?.reload(),
});

@Component({
  selector: 'app-pull-to-refresh',
  template: `
    @if (visible()) {
      <div
        class="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-[calc(env(safe-area-inset-top)+1rem)]"
        [style.transform]="transform()"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          class="flex min-h-11 items-center gap-2 rounded-full border border-vibe-rule bg-vibe-surface px-5 text-sm font-bold text-vibe-ink dark:border-vibe-rule-dark dark:bg-vibe-surface-dark dark:text-vibe-paper"
        >
          <img
            src="/assets/logo-icon-192.png"
            alt=""
            width="32"
            height="32"
            class="size-8 object-contain transition-transform duration-300 ease-out"
            [class.animate-signal-pop]="refreshing()"
            [class.scale-110]="armed()"
            [class.-rotate-12]="!armed() && !refreshing()"
          />
          <span>{{ label() }}</span>
        </div>
      </div>
    }
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullToRefresh implements OnInit, OnDestroy {
  readonly #host = inject(ElementRef<HTMLElement>).nativeElement;
  readonly #reload = inject(PAGE_RELOAD);
  readonly #phase = signal<PullPhase>('idle');
  readonly #offset = signal(0);
  #startX = 0;
  #startY = 0;
  #reloadTimer?: ReturnType<typeof setTimeout>;

  protected readonly visible = computed(() => this.#phase() !== 'idle');
  protected readonly armed = computed(() => this.#phase() === 'armed');
  protected readonly refreshing = computed(() => this.#phase() === 'refreshing');
  protected readonly label = computed(() => {
    if (this.#phase() === 'armed') return 'Thả để làm mới';
    if (this.#phase() === 'refreshing') return 'Đang làm mới';
    return 'Kéo xuống để làm mới';
  });
  protected readonly transform = computed(
    () => `translate3d(0, calc(-100% + ${this.#offset()}px), 0)`,
  );

  ngOnInit(): void {
    this.#host.addEventListener('touchstart', this.#onTouchStart, { passive: true });
    this.#host.addEventListener('touchmove', this.#onTouchMove, { passive: false });
    this.#host.addEventListener('touchend', this.#onTouchEnd, { passive: true });
    this.#host.addEventListener('touchcancel', this.#onTouchCancel, { passive: true });
  }

  ngOnDestroy(): void {
    this.#host.removeEventListener('touchstart', this.#onTouchStart);
    this.#host.removeEventListener('touchmove', this.#onTouchMove);
    this.#host.removeEventListener('touchend', this.#onTouchEnd);
    this.#host.removeEventListener('touchcancel', this.#onTouchCancel);
    if (this.#reloadTimer) clearTimeout(this.#reloadTimer);
  }

  readonly #onTouchStart = (event: TouchEvent): void => {
    if (this.#phase() === 'refreshing' || event.touches.length !== 1 || this.#host.scrollTop > 0) {
      return;
    }
    const target = event.target;
    const touch = event.touches.item(0);
    if (!(target instanceof Element) || target.closest(IGNORED_TARGETS) || !touch) return;
    this.#startX = touch.clientX;
    this.#startY = touch.clientY;
    this.#phase.set('pulling');
  };

  readonly #onTouchMove = (event: TouchEvent): void => {
    const touch = event.touches.item(0);
    if (this.#phase() === 'idle' || !touch || this.#host.scrollTop > 0) {
      this.#reset();
      return;
    }
    const horizontalDistance = Math.abs(touch.clientX - this.#startX);
    const pullDistance = touch.clientY - this.#startY;
    if (pullDistance <= 0 || horizontalDistance > pullDistance) {
      this.#reset();
      return;
    }
    if (event.cancelable) event.preventDefault();
    this.#offset.set(Math.min(MAX_OFFSET_PX, Math.round(pullDistance * PULL_RESISTANCE)));
    this.#phase.set(pullDistance >= ARM_DISTANCE_PX ? 'armed' : 'pulling');
  };

  readonly #onTouchEnd = (): void => {
    if (this.#phase() !== 'armed') {
      this.#reset();
      return;
    }
    this.#offset.set(48);
    this.#phase.set('refreshing');
    this.#reloadTimer = setTimeout(() => this.#reload(), RELOAD_DELAY_MS);
  };

  readonly #onTouchCancel = (): void => this.#reset();

  #reset(): void {
    if (this.#phase() === 'refreshing') return;
    this.#offset.set(0);
    this.#phase.set('idle');
  }
}
