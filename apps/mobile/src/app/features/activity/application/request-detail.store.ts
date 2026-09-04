import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { ActivityEventDetailDto } from '../../../core/api/api-client';
import { ActivityStore } from './activity.store';

/** Each disclosure owns its request; opening another must never replace its answer. */
@Injectable()
export class RequestDetailStore {
  readonly #activity = inject(ActivityStore);
  readonly #id = signal('');
  readonly #active = signal(false);
  readonly #event = signal<ActivityEventDetailDto | null>(null);
  readonly #state = signal<'loading' | 'ready' | 'cached' | 'missing'>('loading');
  #sequence = 0;
  #loading = false;
  readonly event = this.#event.asReadonly();
  readonly state = this.#state.asReadonly();
  readonly #revision = computed(() => {
    const event = this.#activity.events().find((event) => event.id === this.#id());
    return event ? `${event.session?.updatedAt}:${event.resultExcerpt}:${event.eventType}` : '';
  });

  constructor() {
    effect(() => {
      const revision = this.#revision();
      if (this.#active() && revision)
        untracked(() => {
          if (revision !== requestRevision(this.#event())) void this.refresh();
        });
    });
    inject(DestroyRef).onDestroy(() => {
      this.#active.set(false);
      this.#sequence++;
    });
  }

  open(id: string): void {
    if (id !== this.#id()) {
      this.#sequence++;
      this.#event.set(null);
      this.#id.set(id);
    }
    this.#active.set(true);
    void this.refresh();
  }

  close(): void {
    this.#active.set(false);
  }

  async refresh(): Promise<void> {
    if (this.#loading || !this.#id()) return;
    this.#loading = true;
    const sequence = ++this.#sequence;
    const observed = this.#revision();
    if (!this.#event()) this.#state.set('loading');
    const read = await this.#activity.readDetail(this.#id());
    this.#loading = false;
    if (sequence !== this.#sequence) {
      if (this.#active()) void this.refresh();
      return;
    }
    this.#event.set(read.event);
    this.#state.set(read.event ? (read.cached ? 'cached' : 'ready') : 'missing');
    // Catch a signal received during this read, without polling forever if HTTP lags behind SSE.
    if (
      this.#active() &&
      !read.cached &&
      observed !== this.#revision() &&
      requestRevision(read.event) !== this.#revision()
    )
      void this.refresh();
  }
}

function requestRevision(event: ActivityEventDetailDto | null): string {
  return event ? `${event.session?.updatedAt}:${event.resultExcerpt}:${event.eventType}` : '';
}
