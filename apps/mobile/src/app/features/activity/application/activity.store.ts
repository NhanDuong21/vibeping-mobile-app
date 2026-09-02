import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient, type ActivityEventDto, type BootstrapDto } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { ActivityCache, type CachedActivity } from '../data/activity-cache';

type ActivityState = 'loading' | 'ready' | 'cached' | 'partial' | 'unavailable';
type DetailState = 'idle' | 'loading' | 'ready' | 'missing';
const STALE_AFTER_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ActivityStore {
  readonly #api = inject(ApiClient);
  readonly #cache = inject(ActivityCache);
  readonly #eventSourceFactory = inject(EVENT_SOURCE_FACTORY);
  readonly #state = signal<ActivityState>('loading');
  readonly #bootstrap = signal<BootstrapDto | null>(null);
  readonly #events = signal<ActivityEventDto[]>([]);
  readonly #nextCursor = signal<string | null>(null);
  readonly #unreadCount = signal(0);
  readonly #savedAt = signal<Date | null>(null);
  readonly #pendingReadIds = new Set<string>();
  readonly #detailState = signal<DetailState>('idle');
  readonly #selected = signal<ActivityEventDto | null>(null);
  #pendingReadAll = false;
  #stream?: EventSource;
  #started = false;

  readonly state = this.#state.asReadonly();
  readonly current = computed(() => this.#bootstrap()?.currentWork ?? null);
  readonly allowance = computed(() => this.#bootstrap()?.usageLimits ?? null);
  readonly events = this.#events.asReadonly();
  readonly unreadCount = this.#unreadCount.asReadonly();
  readonly hasMore = computed(() => Boolean(this.#nextCursor()));
  readonly selected = this.#selected.asReadonly();
  readonly detailState = this.#detailState.asReadonly();
  readonly isStale = computed(() => {
    const saved = this.#savedAt();
    return (
      this.#state() === 'cached' || Boolean(saved && Date.now() - saved.getTime() > STALE_AFTER_MS)
    );
  });
  readonly headline = computed(() => {
    const current = this.current();
    if (!current) return 'Bạn có thể rời laptop';
    return current.state === 'waiting' ? 'Codex đang chờ bạn' : 'Codex đang làm việc';
  });

  start(): void {
    if (this.#started) return;
    this.#started = true;
    void this.#restoreThenSync();
    this.#connectStream();
    globalThis.addEventListener?.('online', this.#online);
    globalThis.addEventListener?.('offline', this.#offline);
  }

  stop(): void {
    this.#stream?.close();
    this.#stream = undefined;
    this.#started = false;
    globalThis.removeEventListener?.('online', this.#online);
    globalThis.removeEventListener?.('offline', this.#offline);
  }

  async loadMore(): Promise<void> {
    const cursor = this.#nextCursor();
    if (!cursor) return;
    try {
      const feed = await firstValueFrom(this.#api.events(cursor));
      this.#events.set(mergeEvents(this.#events(), feed.events));
      this.#nextCursor.set(feed.nextCursor ?? null);
      this.#unreadCount.set(feed.unreadCount);
      await this.#persist();
    } catch {
      this.#state.set(this.#events().length ? 'partial' : 'unavailable');
    }
  }

  async markAllRead(): Promise<void> {
    this.#events.update((events) => events.map((event) => ({ ...event, isRead: true })));
    this.#unreadCount.set(0);
    this.#pendingReadAll = true;
    this.#pendingReadIds.clear();
    await this.#persist();
    await this.#flushReads();
  }

  async loadDetail(id: string): Promise<void> {
    this.#detailState.set('loading');
    const cached = this.#events().find((event) => event.id === id) ?? null;
    this.#selected.set(cached);
    if (cached) {
      this.#detailState.set('ready');
      await this.#markReadLocally(id);
    }
    try {
      const remote = await firstValueFrom(this.#api.event(id));
      const event = this.#selected()?.isRead ? { ...remote, isRead: true } : remote;
      this.#selected.set(event);
      this.#events.set(mergeEvents(this.#events(), [event]));
      this.#detailState.set('ready');
      if (!cached) await this.#markReadLocally(id);
    } catch {
      if (!cached) this.#detailState.set('missing');
    }
  }

  label(event: ActivityEventDto): string {
    const labels: Record<string, string> = {
      'codex.turn.started': 'Đã bắt đầu',
      'codex.attention.permission_required': 'Cần xác nhận',
      'codex.preview.ready': 'Có bản xem trước',
      'codex.test.failed': 'Kiểm tra chưa đạt',
      'codex.turn.completed': 'Đã hoàn tất',
      'codex.allowance.low': 'Hạn mức sắp thấp',
      'codex.allowance.critical': 'Hạn mức gần hết',
      'codex.allowance.exhausted': 'Đã chạm hạn mức',
    };
    return labels[event.eventType] ?? 'Đã cập nhật';
  }

  time(event: ActivityEventDto): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(event.occurredAt));
  }

  readonly #online = (): void => {
    void this.#sync();
  };

  readonly #offline = (): void => {
    if (this.#events().length || this.#bootstrap()) this.#state.set('cached');
  };

  async #restoreThenSync(): Promise<void> {
    const cached = await this.#cache.read();
    if (cached && this.#state() === 'loading') this.#applyCache(cached);
    await this.#sync();
  }

  async #sync(): Promise<void> {
    try {
      const [bootstrap, feed] = await Promise.all([
        firstValueFrom(this.#api.bootstrap()),
        firstValueFrom(this.#api.events()),
      ]);
      this.#bootstrap.set(bootstrap);
      this.#events.set(mergeEvents(this.#events(), feed.events));
      this.#nextCursor.set(feed.nextCursor ?? null);
      this.#unreadCount.set(
        this.#pendingReadAll
          ? 0
          : Math.max(0, feed.unreadCount - this.#pendingReadIds.size, localUnread(this.#events())),
      );
      this.#savedAt.set(new Date());
      this.#state.set('ready');
      await this.#persist();
      await this.#flushReads();
    } catch {
      this.#state.set(this.#events().length || this.#bootstrap() ? 'cached' : 'unavailable');
    }
  }

  #connectStream(): void {
    const stream = this.#eventSourceFactory('/api/v1/stream');
    stream.addEventListener('activity', (event) => this.#receiveActivity(event));
    stream.onopen = () => {
      if (this.#state() === 'cached' || this.#state() === 'partial') void this.#sync();
    };
    stream.onerror = () => {
      if (this.#events().length || this.#bootstrap()) this.#state.set('cached');
    };
    this.#stream = stream;
  }

  #receiveActivity(raw: Event): void {
    if (raw instanceof MessageEvent) {
      try {
        const event = JSON.parse(String(raw.data)) as ActivityEventDto;
        if (event.id && event.occurredAt) {
          const before = this.#events().length;
          this.#events.set(mergeEvents(this.#events(), [event]));
          if (!event.isRead && this.#events().length > before) {
            this.#unreadCount.update((count) => count + 1);
          }
          void this.#persist();
        }
      } catch {
        // The REST reconciliation below is the safe fallback.
      }
    }
    void this.#sync();
  }

  async #markReadLocally(id: string): Promise<void> {
    const target = this.#events().find((event) => event.id === id);
    if (!target?.isRead) this.#unreadCount.update((count) => Math.max(0, count - 1));
    this.#events.update((events) =>
      events.map((event) => (event.id === id ? { ...event, isRead: true } : event)),
    );
    this.#selected.update((event) => (event?.id === id ? { ...event, isRead: true } : event));
    this.#pendingReadIds.add(id);
    await this.#persist();
    await this.#flushReads();
  }

  async #flushReads(): Promise<void> {
    if (!this.#pendingReadAll && this.#pendingReadIds.size === 0) return;
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      if (this.#pendingReadAll) {
        await firstValueFrom(this.#api.markAllEventsRead(pairing.csrfToken));
        this.#pendingReadAll = false;
      } else {
        for (const id of [...this.#pendingReadIds]) {
          await firstValueFrom(this.#api.markEventRead(id, pairing.csrfToken));
          this.#pendingReadIds.delete(id);
        }
      }
      await this.#persist();
    } catch {
      // Keep the local intent in IndexedDB and retry after reconnect.
    }
  }

  #applyCache(cached: CachedActivity): void {
    this.#bootstrap.set({
      serverTime: cached.savedAt,
      connection: { desktop: 'cached', codex: 'cached', privateConnection: 'cached' },
      cursor: cached.savedAt,
      currentWork: cached.currentWork,
      usageLimits: cached.usageLimits,
      unreadCount: cached.unreadCount,
    });
    this.#events.set(cached.events);
    this.#nextCursor.set(cached.nextCursor);
    this.#unreadCount.set(cached.unreadCount);
    this.#savedAt.set(new Date(cached.savedAt));
    cached.pendingReadIds.forEach((id) => this.#pendingReadIds.add(id));
    this.#pendingReadAll = cached.pendingReadAll;
    this.#state.set('cached');
  }

  async #persist(): Promise<void> {
    const bootstrap = this.#bootstrap();
    if (!bootstrap) return;
    await this.#cache.write({
      savedAt: this.#savedAt()?.toISOString() ?? new Date().toISOString(),
      currentWork: bootstrap.currentWork,
      usageLimits: bootstrap.usageLimits,
      unreadCount: this.#unreadCount(),
      events: this.#events().slice(0, 100),
      nextCursor: this.#nextCursor(),
      pendingReadIds: [...this.#pendingReadIds],
      pendingReadAll: this.#pendingReadAll,
    });
  }
}

export function mergeEvents(
  current: ActivityEventDto[],
  incoming: ActivityEventDto[],
): ActivityEventDto[] {
  const merged = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) {
    const previous = merged.get(event.id);
    merged.set(event.id, previous?.isRead ? { ...event, isRead: true } : event);
  }
  return [...merged.values()].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime() ||
      right.id.localeCompare(left.id),
  );
}

function localUnread(events: ActivityEventDto[]): number {
  return events.filter((event) => !event.isRead).length;
}
