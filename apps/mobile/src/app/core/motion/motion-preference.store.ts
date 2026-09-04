import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type MotionLevel = 'full' | 'balanced' | 'minimal';
const STORAGE_KEY = 'vibeping.motion';

@Injectable({ providedIn: 'root' })
export class MotionPreferenceStore {
  readonly #level = signal<MotionLevel>(this.#read());
  readonly #media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  readonly #reduced = signal(this.#media?.matches ?? false);
  readonly #visible = signal(document.visibilityState !== 'hidden');
  readonly level = this.#level.asReadonly();
  readonly reduced = this.#reduced.asReadonly();
  readonly effective = computed(() => (this.#reduced() ? 'minimal' : this.#level()));
  readonly enabled = computed(() => this.effective() !== 'minimal' && this.#visible());

  constructor() {
    const systemChanged = (): void => this.#reduced.set(this.#media?.matches ?? false);
    const visibilityChanged = (): void => this.#visible.set(document.visibilityState !== 'hidden');
    this.#media?.addEventListener('change', systemChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    effect(() => {
      document.documentElement.dataset['motion'] = this.effective();
      document.documentElement.dataset['motionPaused'] = String(!this.#visible());
    });
    inject(DestroyRef).onDestroy(() => {
      this.#media?.removeEventListener?.('change', systemChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
    });
  }

  set(level: MotionLevel): void {
    this.#level.set(level);
    try {
      localStorage.setItem(STORAGE_KEY, level);
    } catch {
      // The choice still applies to this session if storage is unavailable.
    }
  }

  #read(): MotionLevel {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'balanced' || saved === 'minimal' ? saved : 'full';
    } catch {
      return 'full';
    }
  }
}
