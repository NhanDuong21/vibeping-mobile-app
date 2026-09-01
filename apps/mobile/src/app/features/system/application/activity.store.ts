import { computed, inject, Injectable, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { take } from 'rxjs';
import {
  ApiClient,
  type ActivitySnapshotDto,
} from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';

type ActivityEvent = ActivitySnapshotDto['events'][number];
type ActivityState = 'loading' | 'ready' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class ActivityStore {
  readonly #api = inject(ApiClient);
  readonly #eventSourceFactory = inject(EVENT_SOURCE_FACTORY);
  readonly #snapshot = signal<ActivitySnapshotDto | null>(null);
  readonly #state = signal<ActivityState>('loading');
  #request?: Subscription;
  #stream?: EventSource;
  #started = false;

  readonly snapshot = this.#snapshot.asReadonly();
  readonly state = this.#state.asReadonly();
  readonly current = computed(() => this.#snapshot()?.currentWork ?? null);
  readonly events = computed(() => this.#snapshot()?.events ?? []);
  readonly headline = computed(() => {
    const current = this.current();
    if (!current) return 'Bạn có thể rời laptop';
    return current.state === 'waiting'
      ? 'Codex đang chờ bạn'
      : 'Codex đang làm việc';
  });

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#load();
    this.#stream = this.#eventSourceFactory('/api/v1/stream');
    this.#stream.addEventListener('activity', () => this.#load());
  }

  stop(): void {
    this.#request?.unsubscribe();
    this.#stream?.close();
    this.#stream = undefined;
    this.#started = false;
  }

  label(event: ActivityEvent): string {
    const labels: Record<string, string> = {
      'codex.turn.started': 'Đã bắt đầu',
      'codex.attention.permission_required': 'Cần xác nhận',
      'codex.preview.ready': 'Có bản xem trước',
      'codex.test.failed': 'Kiểm tra chưa đạt',
      'codex.turn.completed': 'Đã hoàn tất',
    };
    return labels[event.eventType] ?? 'Đã cập nhật';
  }

  time(event: ActivityEvent): string {
    return new Date(event.occurredAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  #load(): void {
    this.#request?.unsubscribe();
    this.#request = this.#api
      .activity()
      .pipe(take(1))
      .subscribe({
        next: (snapshot) => {
          this.#snapshot.set(snapshot);
          this.#state.set('ready');
        },
        error: () => this.#state.set('unavailable'),
      });
  }
}
