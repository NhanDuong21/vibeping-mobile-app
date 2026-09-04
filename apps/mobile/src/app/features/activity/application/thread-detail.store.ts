import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { ApiClient, type ActivityEventDto, type EventFeedDto } from '../../../core/api/api-client';
import { MobileSnapshotStorage } from '../../../core/cache/mobile-snapshot-storage';
import { isCachedEvent } from '../data/activity-cache';
import { ActivityStore } from './activity.store';
import { mergeEvents } from './activity-reconciliation';
import { mergeSessionFeed } from './session-cache-migration';

@Injectable({ providedIn: 'root' })
export class ThreadDetailStore {
  readonly #api = inject(ApiClient);
  readonly #activity = inject(ActivityStore);
  readonly #storage = inject(MobileSnapshotStorage);
  readonly #id = signal('');
  readonly #turns = signal<ActivityEventDto[]>([]);
  readonly #cursor = signal<string | null>(null);
  readonly #state = signal<'loading' | 'ready' | 'cached' | 'missing'>('loading');
  readonly #loadingMore = signal(false);
  #expanded = false;
  #sequence = 0;
  readonly state = this.#state.asReadonly();
  readonly canonicalId = this.#id.asReadonly();
  readonly loadingMore = this.#loadingMore.asReadonly();
  readonly hasMore = computed(() => Boolean(this.#cursor()));
  readonly turns = computed(() =>
    mergeEvents(
      this.#turns(),
      this.#activity
        .events()
        .filter(
          (event) =>
            event.session?.thread?.id === this.#id() &&
            (event.id === event.session.thread.latestTurnId ||
              this.#turns().some((turn) => turn.id === event.id)),
        ),
    ).sort((a, b) => (b.session?.thread?.turnNumber ?? 0) - (a.session?.thread?.turnNumber ?? 0)),
  );
  readonly latest = computed(
    () =>
      this.turns().find((event) => event.id === event.session?.thread?.latestTurnId) ??
      this.turns()[0] ??
      null,
  );
  readonly previous = computed(() =>
    this.turns().filter((event) => event.id !== this.latest()?.id),
  );
  readonly #target = signal<string | null>(null);
  readonly target = this.#target.asReadonly();
  readonly #revision = computed(() => {
    const event = this.#activity
      .threads()
      .find((event) => event.session?.thread?.id === this.#id());
    return event
      ? `${event.id}:${event.session?.updatedAt}:${event.session?.thread?.turnCount}:${event.isRead}:${event.resultExcerpt}`
      : '';
  });

  constructor() {
    effect(() => {
      const revision = this.#revision();
      if (revision) untracked(() => void this.refresh());
    });
  }

  async open(id: string, request: string | null = null): Promise<void> {
    this.#target.set(request);
    if (id === this.#id()) {
      await this.refresh();
      await this.#includeTarget(this.#id(), request);
      return;
    }
    this.#sequence++;
    this.#turns.set([]);
    this.#cursor.set(null);
    this.#expanded = false;
    this.#loadingMore.set(false);
    this.#state.set('loading');
    this.#id.set(id);
    try {
      const cached = await this.#storage.read(`thread:${id}`);
      if (id !== this.#id()) return;
      if (isThreadCache(cached, id)) {
        const recent = cached.events.slice(0, 10);
        this.#turns.set(recent);
        this.#cursor.set(cacheCursor(recent));
        this.#state.set('cached');
      }
    } catch {
      /* Server is authoritative; a missing cache does not block reading. */
    }
    await this.refresh();
    await this.#includeTarget(this.#id(), request);
  }

  async refresh(): Promise<void> {
    const id = this.#id();
    if (!id) return;
    const sequence = ++this.#sequence;
    try {
      const feed = await firstValueFrom(this.#api.threadTurns(id).pipe(timeout(10_000)));
      if (sequence !== this.#sequence) return;
      const canonical = feed.events[0]?.session?.thread?.id ?? id;
      this.#id.set(canonical);
      this.#turns.set(mergeSessionFeed(this.#turns(), feed.events, []).events);
      if (!this.#expanded) this.#cursor.set(feed.nextCursor ?? null);
      this.#state.set(this.turns().length ? 'ready' : 'missing');
      await this.#persist(canonical);
    } catch {
      if (sequence === this.#sequence) this.#state.set(this.turns().length ? 'cached' : 'missing');
    }
  }

  async loadMore(): Promise<void> {
    const cursor = this.#cursor();
    const id = this.#id();
    if (!cursor || this.#loadingMore()) return;
    this.#loadingMore.set(true);
    try {
      const feed = await firstValueFrom(this.#api.threadTurns(id, cursor).pipe(timeout(10_000)));
      if (id !== this.#id()) return;
      this.#turns.set(mergeSessionFeed(this.#turns(), feed.events, []).events);
      this.#cursor.set(feed.nextCursor ?? null);
      this.#expanded = true;
      this.#state.set('ready');
      await this.#persist(id);
    } catch {
      if (id === this.#id()) this.#state.set('cached');
    } finally {
      if (id === this.#id()) this.#loadingMore.set(false);
    }
  }

  async #includeTarget(id: string, request: string | null): Promise<void> {
    if (
      !request ||
      request !== this.#target() ||
      id !== this.#id() ||
      this.turns().some((event) => event.id === request)
    )
      return;
    const read = await this.#activity.readDetail(request);
    if (id !== this.#id() || request !== this.#target()) return;
    if (read.event?.session?.thread?.id === id)
      this.#turns.set(mergeEvents(this.#turns(), [read.event]));
  }

  async #persist(id: string): Promise<void> {
    try {
      const events = [this.latest(), ...this.previous()]
        .filter((event) => event !== null)
        .slice(0, 100);
      await this.#storage.write(`thread:${id}`, {
        events,
        nextCursor: cacheCursor(events),
        unreadCount: 0,
      });
    } catch {
      /* Cache is optional. */
    }
  }
}

function cacheCursor(events: ActivityEventDto[]): string | null {
  const thread = events[0]?.session?.thread;
  if (!thread || thread.turnCount <= events.length) return null;
  const older = events.filter((event) => event.id !== thread.latestTurnId);
  return String(older.at(-1)?.session?.thread?.turnNumber ?? '9223372036854775807');
}

function isThreadCache(value: unknown, id: string): value is EventFeedDto {
  if (!value || typeof value !== 'object') return false;
  const feed = value as EventFeedDto;
  return (
    Array.isArray(feed.events) &&
    feed.events.length <= 100 &&
    feed.events.every((event) => isCachedEvent(event) && event.session?.thread?.id === id) &&
    (feed.nextCursor === null || typeof feed.nextCursor === 'string')
  );
}
