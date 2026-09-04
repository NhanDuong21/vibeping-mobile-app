import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, timeout } from 'rxjs';
import {
  ApiClient,
  type ActivityEventDetailDto,
  type ActivityEventDto,
  type BootstrapDto,
  type CurrentWorkDto,
} from '../../../core/api/api-client';
import { ActivityLiveConnection } from '../data/activity-live-connection';
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
  readonly #live = inject(ActivityLiveConnection);
  readonly #state = signal<ActivityState>('loading');
  readonly #bootstrap = signal<BootstrapDto | null>(null);
  readonly #events = signal<ActivityEventDto[]>([]);
  readonly #nextCursor = signal<string | null>(null);
  readonly #unreadCount = signal(0);
  readonly #savedAt = signal<Date | null>(null);
  readonly #pendingReadIds = new Set<string>();
  readonly #detailState = signal<DetailState>('idle');
  readonly #selected = signal<ActivityEventDetailDto | null>(null);
  readonly #readAllState = signal<ReadAllState>('idle');
  readonly #newEventId = signal<string | null>(null);
  #pendingReadAll = false;
  #pendingWork: CurrentWorkDto | null | undefined;
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
  readonly now = this.#live.now;
  readonly isStale = computed(() => {
    const saved = this.#savedAt();
    return (
      this.#state() === 'cached' ||
      Boolean(saved && this.now().getTime() - saved.getTime() > STALE_AFTER_MS)
    );
  });
  readonly readiness = computed<ReadinessView>(() =>
    readinessView(
      this.#state(),
      this.#live.connected(),
      this.#bootstrap()?.connection,
      this.current(),
      this.#events()[0] ?? null,
      this.now(),
    ),
  );
  readonly motionActive = computed(
    () => this.readiness().kind === 'working' && this.#live.visible(),
  );

  constructor() {
    this.#live.events.pipe(takeUntilDestroyed()).subscribe((message) => {
      switch (message.type) {
        case 'activity':
          this.#receiveActivity(message.event);
          break;
        case 'work':
          this.#receiveWork(message.event);
          break;
        case 'allowance':
          this.#usage.receiveEvent(message.event);
          break;
        case 'reconcile':
          void this.#sync();
          break;
        case 'disconnected':
          this.#usage.markDisconnected();
          this.#state.set(this.#bootstrap() ? 'cached' : 'unavailable');
      }
    });
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    void this.#restoreThenSync();
    this.#live.start();
  }

  stop(): void {
    this.#syncSequence++;
    this.#live.stop();
    clearTimeout(this.#newEventTimer);
    this.#newEventTimer = undefined;
    this.#started = false;
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

  async #restoreThenSync(): Promise<void> {
    const [cached] = await Promise.all([this.#cache.read(), this.#usage.restoreCached()]);
    if (!this.#started) return;
    if (cached && !this.#bootstrap()) this.#applyCache(cached);
    await this.#sync();
  }

  async #sync(): Promise<void> {
    if (!this.#started) return;
    const sequence = ++this.#syncSequence;
    const workRevision = this.#workRevision;
    try {
      const [bootstrap, feed] = await Promise.all([
        firstValueFrom(this.#api.bootstrap().pipe(timeout(10_000))),
        firstValueFrom(this.#api.events().pipe(timeout(10_000))),
      ]);
      if (sequence !== this.#syncSequence) return;
      this.#usage.acceptSnapshot(bootstrap.usageLimits);
      const currentWork =
        workRevision !== this.#workRevision
          ? this.#bootstrap()
            ? this.current()
            : (this.#pendingWork ?? null)
          : bootstrap.currentWork;
      this.#bootstrap.set({ ...bootstrap, currentWork });
      this.#pendingWork = undefined;
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

  #receiveActivity(raw: Event): void {
    if (raw instanceof MessageEvent) {
      try {
        const event = JSON.parse(String(raw.data)) as ActivityEventDto;
        if (event.id && event.occurredAt) {
          const before = this.#events().length;
          this.#events.set(mergeEvents(this.#events(), [event]));
          if (!event.isRead && this.#events().length > before) {
            this.#unreadCount.update((count) => count + 1);
            if (isLiveMotionEvent(event, this.#live.visible(), Date.now()))
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
      const shouldReconcile =
        bootstrap.connection.codex === 'needsReview' || this.#state() !== 'ready';
      this.#bootstrap.set({ ...bootstrap, currentWork: current });
      this.#savedAt.set(new Date());
      void this.#persist();
      if (shouldReconcile) void this.#sync();
    } catch {
      void this.#sync();
    }
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
