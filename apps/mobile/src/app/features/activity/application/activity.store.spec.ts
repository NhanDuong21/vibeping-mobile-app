import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { ActivityCache, type CachedActivity } from '../data/activity-cache';
import { ActivityStore, mergeEvents } from './activity.store';

const event = {
  id: 'event-1',
  eventType: 'codex.turn.completed',
  title: 'Codex đã hoàn tất',
  summary: 'Công việc đã hoàn tất trên laptop.',
  projectName: 'vibeping',
  occurredAt: '2026-09-02T00:01:00Z',
  isRead: false,
};

const bootstrap = {
  serverTime: '2026-09-02T00:02:00Z',
  connection: { desktop: 'running', codex: 'ready', privateConnection: 'local' },
  cursor: '1',
  currentWork: null,
  unreadCount: 1,
  usageLimits: { state: 'available', readAt: null, windows: [], cursor: '1' },
};

describe('ActivityStore', () => {
  it('merges duplicate SSE events once and keeps the unread badge stable', async () => {
    const listeners = new Map<string, EventListener>();
    const api = {
      bootstrap: vi.fn().mockReturnValue(of(bootstrap)),
      events: vi.fn().mockReturnValue(of({ events: [event], nextCursor: null, unreadCount: 1 })),
      pairingStatus: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
    };
    const cache = {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    };
    const stream = {
      addEventListener: vi.fn((name: string, listener: EventListener) =>
        listeners.set(name, listener),
      ),
      close: vi.fn(),
    } as unknown as EventSource;
    TestBed.configureTestingModule({
      providers: [
        ActivityStore,
        { provide: ApiClient, useValue: api },
        { provide: ActivityCache, useValue: cache },
        { provide: EVENT_SOURCE_FACTORY, useValue: () => stream },
      ],
    });
    const store = TestBed.inject(ActivityStore);
    store.start();
    await vi.waitFor(() => expect(store.events()).toHaveLength(1));
    const incoming = { ...event, id: 'event-2', occurredAt: '2026-09-02T00:03:00Z' };
    const message = new MessageEvent('activity', { data: JSON.stringify(incoming) });
    listeners.get('activity')?.(message);
    listeners.get('activity')?.(message);
    await vi.waitFor(() => expect(store.events()).toHaveLength(2));
    expect(store.unreadCount()).toBe(2);
    store.stop();
  });

  it('opens a stale IndexedDB projection when the laptop is unavailable', async () => {
    const cached: CachedActivity = {
      savedAt: '2026-01-01T00:00:00Z',
      currentWork: null,
      usageLimits: bootstrap.usageLimits,
      unreadCount: 1,
      events: [event],
      nextCursor: null,
      pendingReadIds: [],
      pendingReadAll: false,
    };
    const api = {
      bootstrap: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
      events: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
    };
    TestBed.configureTestingModule({
      providers: [
        ActivityStore,
        { provide: ApiClient, useValue: api },
        {
          provide: ActivityCache,
          useValue: { read: () => Promise.resolve(cached), write: vi.fn() },
        },
        {
          provide: EVENT_SOURCE_FACTORY,
          useValue: () => ({ addEventListener: vi.fn(), close: vi.fn() }),
        },
      ],
    });
    const store = TestBed.inject(ActivityStore);
    store.start();
    await vi.waitFor(() => expect(store.state()).toBe('cached'));
    expect(store.events()).toEqual([event]);
    expect(store.isStale()).toBe(true);
    store.stop();
  });

  it('applies current work and completion from SSE without waiting for a REST refresh', async () => {
    const listeners = new Map<string, EventListener>();
    const api = {
      bootstrap: vi.fn().mockReturnValue(of({ ...bootstrap, currentWork: null })),
      events: vi.fn().mockReturnValue(of({ events: [], nextCursor: null, unreadCount: 0 })),
      pairingStatus: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
    };
    const stream = {
      addEventListener: vi.fn((name: string, listener: EventListener) =>
        listeners.set(name, listener),
      ),
      close: vi.fn(),
    } as unknown as EventSource;
    TestBed.configureTestingModule({
      providers: [
        ActivityStore,
        { provide: ApiClient, useValue: api },
        {
          provide: ActivityCache,
          useValue: { read: vi.fn().mockResolvedValue(null), write: vi.fn() },
        },
        { provide: EVENT_SOURCE_FACTORY, useValue: () => stream },
      ],
    });
    const store = TestBed.inject(ActivityStore);
    store.start();
    await vi.waitFor(() => expect(store.state()).toBe('ready'));
    const currentWork = {
      projectName: 'vibeping-mobile-app',
      state: 'running',
      startedAt: '2026-09-02T00:03:00Z',
      updatedAt: '2026-09-02T00:03:00Z',
    };

    listeners.get('work')?.(new MessageEvent('work', { data: JSON.stringify(currentWork) }));
    expect(store.headline()).toBe('Codex đang làm việc');
    expect(store.current()).toEqual(currentWork);
    expect(api.bootstrap).toHaveBeenCalledTimes(1);

    listeners.get('work')?.(new MessageEvent('work', { data: 'null' }));
    expect(store.headline()).toBe('Bạn có thể rời laptop');
    expect(store.current()).toBeNull();
    expect(api.bootstrap).toHaveBeenCalledTimes(1);
    store.stop();
  });

  it('preserves optimistic read state while reconciling duplicate records', () => {
    expect(mergeEvents([{ ...event, isRead: true }], [event])).toEqual([
      { ...event, isRead: true },
    ]);
  });
});
