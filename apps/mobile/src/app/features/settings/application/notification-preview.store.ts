import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { ApiClient, type NotificationPreviewDto } from '../../../core/api/api-client';

@Injectable({ providedIn: 'root' })
export class NotificationPreviewStore {
  readonly #api = inject(ApiClient);
  readonly #snapshot = signal<NotificationPreviewDto | null>(null);
  readonly #state = signal<'loading' | 'ready' | 'unavailable'>('loading');
  #request = 0;

  readonly snapshot = this.#snapshot.asReadonly();
  readonly state = this.#state.asReadonly();

  async load(): Promise<void> {
    const request = ++this.#request;
    this.#snapshot.set(null);
    this.#state.set('loading');
    try {
      const value = await firstValueFrom(this.#api.notificationPreview().pipe(timeout(8000)));
      if (request !== this.#request) return;
      this.#snapshot.set(value);
      this.#state.set('ready');
    } catch {
      if (request === this.#request) this.#state.set('unavailable');
    }
  }
}
