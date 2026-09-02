import { computed, inject, Injectable, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { take } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { EVENT_SOURCE_FACTORY } from './event-source';

export type ConnectionState = 'loading' | 'online' | 'offline';

@Injectable({ providedIn: 'root' })
export class ConnectivityStore {
  readonly #api = inject(ApiClient);
  readonly #eventSourceFactory = inject(EVENT_SOURCE_FACTORY);
  readonly #state = signal<ConnectionState>('loading');
  readonly #lastSync = signal<Date | null>(null);
  #bootstrapSubscription?: Subscription;
  #stream?: EventSource;
  #started = false;

  readonly state = this.#state.asReadonly();
  readonly lastSync = this.#lastSync.asReadonly();
  readonly view = computed(() => connectionView(this.#state()));

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#state.set('loading');
    this.#bootstrapSubscription = this.#api
      .bootstrap()
      .pipe(take(1))
      .subscribe({
        next: (snapshot) => {
          this.#lastSync.set(new Date(snapshot.serverTime));
          this.#connectStream();
        },
        error: () => this.#state.set('offline'),
      });
  }

  stop(): void {
    this.#bootstrapSubscription?.unsubscribe();
    this.#stream?.close();
    this.#stream = undefined;
    this.#started = false;
  }

  #connectStream(): void {
    const stream = this.#eventSourceFactory('/api/v1/stream');
    stream.onopen = () => this.#state.set('online');
    stream.onerror = () => this.#state.set('offline');
    stream.addEventListener('connected', () => this.#state.set('online'));
    this.#stream = stream;
  }
}

function connectionView(state: ConnectionState): {
  title: string;
  detail: string;
  label: string;
} {
  if (state === 'online') {
    return {
      title: 'Đã kết nối với laptop',
      detail: 'VibePing đang sẵn sàng nhận tín hiệu.',
      label: 'Đang hoạt động',
    };
  }
  if (state === 'offline') {
    return {
      title: 'Chưa kết nối được với laptop',
      detail: 'VibePing sẽ tự thử lại.',
      label: 'Chưa kết nối',
    };
  }
  return {
    title: 'Đang kết nối với laptop',
    detail: 'Việc này thường chỉ mất vài giây.',
    label: 'Đang kiểm tra',
  };
}
