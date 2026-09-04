import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiClient,
  type ActivityEventDetailDto,
  type ActivityEventDto,
  type BootstrapDto,
  type CurrentWorkDto,
} from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { UsageLimitsStore } from '../../usage-limits';
import { ActivityCache, type CachedActivity } from '../data/activity-cache';
import { isCurrentWork, localUnread, mergeEvents } from './activity-reconciliation';
import { readinessView, type ReadinessSourceState, type ReadinessView } from './readiness';
import { isLiveMotionEvent } from './event-motion';

type ActivityState = ReadinessSourceState;
type DetailState = 'idle' | 'loading' | 'ready' | 'missing';
type ReadAllState = 'idle' | 'saving' | 'saved' | 'failed';
const STALE_AFTER_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ActivityStore {
  readonly #api = inject(ApiClient);
  readonly #cache = inject(ActivityCache);
  readonly #usage = inject(UsageLimitsStore);
  readonly #eventSourceFactory = inject(EVENT_SOURCE_FACTORY);
  readonly #state = signal<ActivityState>('loading');
  readonly #bootstrap = signal<BootstrapDto | null>(null);
  readonly #events = signal<ActivityEventDto[]>([]);
  readonly #nextCursor = signal<string | null>(null);
  readonly #unreadCount = signal(0);
  readonly #savedAt = signal<Date | null>(null);
  readonly #pendingReadIds = new Set<string>();
  readonly #detailState = signal<DetailState>('idle');
  readonly #selected = signal<ActivityEventDetailDto | null>(null);
  readonly #streamConnected = signal(false);
  readonly #readAllState = signal<ReadAllState>('idle');
  readonly #newEventId = signal<string | null>(null);
  readonly #clock = signal(new Date());
  readonly #pageVisible = signal(globalThis.document?.visibilityState !== 'hidden');
  #pendingReadAll = false;
  #pendingWork: CurrentWorkDto | null | undefined;
  #stream?: EventSource;
  #clockTimer?: ReturnType<typeof setInterval>;
  #newEventTimer?: ReturnType<typeof setTimeout>;
  #started = false;
  #syncSequence = 0;
  #workRevision = 0;

  readonly state = this.#state.asReadonly();
  readonly current = computed(() => this.#bootstrap()?.currentWork ?? null);
  readonly allowance = this.#usage.snapshot;
  readonly codexNeedsReview = computed(() => this.#bootstrap()?.connection.codex === 'needsReview');
  readonly events = this.#events.asReadonly();
  readonly unreadCount = this.#unreadCount.asReadonly();
  readonly hasMore = computed(() => Boolean(this.#nextCursor()));
  readonly selected = this.#selected.asReadonly();
  readonly detailState = this.#detailState.asReadonly();
  readonly readAllState = this.#readAllState.asReadonly();
  readonly newEventId = this.#newEventId.asReadonly();
  readonly now = this.#clock.asReadonly();
  readonly isStale = computed(() => {
    const saved = this.#savedAt();
    return (
      this.#state() === 'cached' ||
      Boolean(saved && this.#clock().getTime() - saved.getTime() > STALE_AFTER_MS)
    );
  });
  readonly readiness = computed<ReadinessView>(() =>
    readinessView(
      this.#state(),
      this.#streamConnected(),
      this.#bootstrap()?.connection,
      this.current(),
      this.#events()[0] ?? null,
      this.#clock(),
    ),
  );
  readonly motionActive = computed(
    () => this.readiness().kind === 'working' && this.#pageVisible(),
  );

  start(): void {
    if (this.#started) return;
    this.#started = true;
    void this.#restoreThenSync();
    this.#connectStream();
    this.#clockTimer = setInterval(() => this.#clock.set(new Date()), 30_000);
    globalThis.addEventListener?.('online', this.#online);
    globalThis.addEventListener?.('offline', this.#offline);
    globalThis.document?.addEventListener('visibilitychange', this.#visibilityChanged);
  }

  stop(): void {
    this.#syncSequence++;
    this.#stream?.close();
    this.#stream = undefined;
    this.#streamConnected.set(false);
    clearInterval(this.#clockTimer);
    clearTimeout(this.#newEventTimer);
    this.#clockTimer = undefined;
    this.#newEventTimer = undefined;
    this.#started = false;
    globalThis.removeEventListener?.('online', this.#online);
    globalThis.removeEventListener?.('offline', this.#offline);
    globalThis.document?.removeEventListener('visibilitychange', this.#visibilityChanged);
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
    if (this.#readAllState() === 'saving') return;
    this.#events.update((events) => events.map((event) => ({ ...event, isRead: true })));
    this.#unreadCount.set(0);
    this.#pendingReadAll = true;
    this.#pendingReadIds.clear();
    this.#readAllState.set('saving');
    await this.#persist();
    const saved = await this.#flushReads();
    this.#readAllState.set(saved ? 'saved' : 'failed');
  }

  async loadDetail(id: string): Promise<void> {
    this.#detailState.set('loading');
    const cached = this.#events().find((event) => event.id === id) ?? null;
    this.#selected.set(cached ? { ...cached, timeline: [] } : null);
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

  readonly #online = (): void => {
    void this.#sync();
  };

  readonly #offline = (): void => {
    this.#usage.markDisconnected();
    if (this.#events().length || this.#bootstrap()) this.#state.set('cached');
  };

  readonly #visibilityChanged = (): void => {
    this.#pageVisible.set(globalThis.document?.visibilityState !== 'hidden');
    this.#clock.set(new Date());
    if (this.#pageVisible()) void this.#sync();
  };

  async #restoreThenSync(): Promise<void> {
    const [cached] = await Promise.all([this.#cache.read(), this.#usage.restoreCached()]);
    if (cached && this.#state() === 'loading') this.#applyCache(cached);
    await this.#sync();
  }

  async #sync(): Promise<void> {
    const sequence = ++this.#syncSequence;
    const workRevision = this.#workRevision;
    try {
      const [bootstrap, feed] = await Promise.all([
        firstValueFrom(this.#api.bootstrap()),
        firstValueFrom(this.#api.events()),
      ]);
      if (sequence !== this.#syncSequence) return;
      this.#usage.acceptSnapshot(bootstrap.usageLimits);
      this.#bootstrap.set(
        workRevision !== this.#workRevision && this.#bootstrap()
          ? { ...bootstrap, currentWork: this.current() }
          : this.#pendingWork === undefined
            ? bootstrap
            : { ...bootstrap, currentWork: this.#takePendingWork() },
      );
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
      if (sequence !== this.#syncSequence) return;
      this.#usage.markDisconnected();
      this.#state.set(this.#events().length || this.#bootstrap() ? 'cached' : 'unavailable');
    }
  }

  #connectStream(): void {
    const stream = this.#eventSourceFactory('/api/v1/stream');
    stream.addEventListener('activity', (event) => this.#receiveActivity(event));
    stream.addEventListener('work', (event) => this.#receiveWork(event));
    stream.addEventListener('allowance', (event) => this.#usage.receiveEvent(event));
    stream.addEventListener('connected', () => this.#streamOpened());
    stream.onopen = () => this.#streamOpened();
    stream.onerror = () => {
      this.#usage.markDisconnected();
      this.#streamConnected.set(false);
      if (this.#events().length || this.#bootstrap()) this.#state.set('cached');
      else if (this.#state() !== 'loading') this.#state.set('unavailable');
    };
    this.#stream = stream;
  }

  #streamOpened(): void {
    this.#streamConnected.set(true);
    if (['cached', 'partial', 'unavailable'].includes(this.#state())) void this.#sync();
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
            if (isLiveMotionEvent(event, this.#pageVisible(), Date.now()))
              this.#showNewEvent(event.id);
          }
          void this.#persist();
        }
      } catch {
        // The REST reconciliation below is the safe fallback.
      }
    }
    void this.#sync();
  }

  #receiveWork(raw: Event): void {
    if (!(raw instanceof MessageEvent)) return;
    try {
      const current = JSON.parse(String(raw.data)) as unknown;
      if (current !== null && !isCurrentWork(current)) throw new Error('invalid current work');
      this.#workRevision++;
      const bootstrap = this.#bootstrap();
      if (!bootstrap) {
        this.#pendingWork = current;
        void this.#sync();
        return;
      }
      const shouldRefreshCodexStatus = bootstrap.connection.codex === 'needsReview';
      this.#bootstrap.set({ ...bootstrap, currentWork: current });
      this.#savedAt.set(new Date());
      void this.#persist();
      if (shouldRefreshCodexStatus) void this.#sync();
    } catch {
      void this.#sync();
    }
  }

  #takePendingWork(): CurrentWorkDto | null {
    const current = this.#pendingWork ?? null;
    this.#pendingWork = undefined;
    return current;
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

  async #flushReads(): Promise<boolean> {
    if (!this.#pendingReadAll && this.#pendingReadIds.size === 0) return true;
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
      return true;
    } catch {
      // Keep the local intent in IndexedDB and retry after reconnect.
      return false;
    }
  }

  #showNewEvent(id: string): void {
    clearTimeout(this.#newEventTimer);
    this.#newEventId.set(id);
    this.#newEventTimer = setTimeout(() => this.#newEventId.set(null), 900);
  }

  #applyCache(cached: CachedActivity): void {
    this.#usage.acceptCached(cached.usageLimits);
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
      usageLimits: this.#usage.snapshot() ?? bootstrap.usageLimits,
      unreadCount: this.#unreadCount(),
      events: this.#events().slice(0, 100),
      nextCursor: this.#nextCursor(),
      pendingReadIds: [...this.#pendingReadIds],
      pendingReadAll: this.#pendingReadAll,
    });
  }
}
