import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ApiClient, type BootstrapDto } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { ActivityCache } from '../data/activity-cache';
import { ActivityStore } from './activity.store';

const now = new Date('2026-09-04T00:00:00Z');
const work = {
  projectName: 'VibePing',
  state: 'running',
  lastTestState: 'unknown',
  previewReady: false,
  startedAt: now.toISOString(),
  updatedAt: now.toISOString(),
  freshUntil: new Date(now.getTime() + 120_000).toISOString(),
};
const bootstrap: BootstrapDto = {
  serverTime: now.toISOString(),
  cursor: '1',
  unreadCount: 0,
  connection: { desktop: 'running', codex: 'ready', privateConnection: 'local' },
  currentWork: work,
  usageLimits: { state: 'available', readAt: null, windows: [], cursor: '1' },
};

function setup() {
  const listeners = new Map<string, EventListener>();
  const api = {
    bootstrap: vi.fn().mockReturnValue(of(bootstrap)),
    events: vi.fn().mockReturnValue(of({ events: [], nextCursor: null, unreadCount: 0 })),
  };
  const stream = {
    addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
    close: vi.fn(),
  };
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
  listeners.get('connected')?.(new Event('connected'));
  return { store, api, listeners };
}

describe('live work freshness and reconciliation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it('stops the working animation when evidence expires without needing SSE', async () => {
    const { store } = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.motionActive()).toBe(true);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(store.readiness().kind).toBe('unconfirmed');
    expect(store.motionActive()).toBe(false);
    expect(store.events()).toEqual([]);
    store.stop();
  });

  it('expires immediately on foreground and reconciles a missed completion', async () => {
    const { store, api } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const response = new Subject<BootstrapDto>();
    api.bootstrap.mockReturnValue(response);
    vi.setSystemTime(new Date(now.getTime() + 180_000));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.readiness().kind).toBe('unconfirmed');
    expect(store.motionActive()).toBe(false);
    response.next({ ...bootstrap, currentWork: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.current()).toBeNull();
    store.stop();
  });

  it('does not let an in-flight REST snapshot resurrect work after SSE completion', async () => {
    const { store, api, listeners } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const response = new Subject<BootstrapDto>();
    api.bootstrap.mockReturnValue(response);
    globalThis.dispatchEvent(new Event('online'));
    listeners.get('work')?.(new MessageEvent('work', { data: 'null' }));
    response.next(bootstrap);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.current()).toBeNull();
    expect(store.motionActive()).toBe(false);
    store.stop();
  });

  it('ignores an older REST request that completes after a newer reconciliation', async () => {
    const { store, api } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const older = new Subject<BootstrapDto>();
    const newer = new Subject<BootstrapDto>();
    api.bootstrap.mockReturnValueOnce(older).mockReturnValueOnce(newer);
    globalThis.dispatchEvent(new Event('online'));
    globalThis.dispatchEvent(new Event('online'));
    newer.next({ ...bootstrap, currentWork: null });
    await vi.advanceTimersByTimeAsync(0);
    older.next(bootstrap);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.current()).toBeNull();
    store.stop();
  });
});
