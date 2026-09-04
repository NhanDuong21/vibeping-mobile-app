import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiClient, type UsageLimitsSnapshotDto } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { UsageLimitsCache } from '../data/usage-limits-cache';
import { UsageLimitsStore } from './usage-limits.store';

const reading: UsageLimitsSnapshotDto = {
  state: 'available',
  readAt: '2026-09-04T03:00:00Z',
  cursor: '1',
  windows: [
    {
      windowKey: 'primary',
      label: 'Lượt dùng 5 giờ',
      windowKind: 'primary',
      remainingPercent: 37,
      durationMinutes: 300,
      resetsAt: 1_788_498_000,
      reached: false,
    },
  ],
};
const unavailable: UsageLimitsSnapshotDto = {
  state: 'unavailable',
  readAt: null,
  cursor: '2',
  windows: [],
};

function setup(cached: UsageLimitsSnapshotDto | null = reading) {
  const api = {
    usageLimits: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
    pairingStatus: vi.fn().mockReturnValue(of({ csrfToken: 'fixture' })),
    refreshUsageLimits: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
  };
  const cache = {
    read: vi.fn().mockResolvedValue(cached),
    write: vi.fn().mockResolvedValue(undefined),
  };
  const listeners = new Map<string, EventListener>();
  const stream = {
    addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
    close: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      UsageLimitsStore,
      { provide: ApiClient, useValue: api },
      { provide: UsageLimitsCache, useValue: cache },
      { provide: EVENT_SOURCE_FACTORY, useValue: () => stream },
    ],
  });
  return { store: TestBed.inject(UsageLimitsStore), api, cache, listeners };
}

describe('last known allowance', () => {
  it('restores the last reading on a cold offline launch and keeps its original time', async () => {
    const { store, cache } = setup();
    store.start();
    await vi.waitFor(() => expect(store.windows()).toEqual(reading.windows));
    expect(store.state()).toBe('stale');
    expect(store.snapshot()?.readAt).toBe(reading.readAt);
    expect(store.readerState()).toBe('ready');
    expect(store.resetLabel(store.windows()[0])).toMatch(/^Mốc đặt lại đã lưu:/);
    expect(cache.write).not.toHaveBeenCalled();
    store.stop();
  });

  it('never erases a good snapshot on empty responses or failed manual refresh', async () => {
    const { store, api, cache } = setup(null);
    api.usageLimits.mockReturnValue(of(reading));
    store.start();
    store.acceptSnapshot(unavailable);
    store.acceptSnapshot({ ...unavailable, state: 'noWindows' });
    await store.refresh();
    expect(store.windows()).toEqual(reading.windows);
    expect(store.snapshot()?.readAt).toBe(reading.readAt);
    expect(store.readerState()).toBe('ready');
    expect(store.state()).toBe('stale');
    expect(cache.write).toHaveBeenCalledTimes(1);
    store.stop();
  });

  it('only reports unavailable if this phone has never saved a usable reading', async () => {
    const { store } = setup(null);
    store.start();
    await store.restoreCached();
    expect(store.windows()).toEqual([]);
    expect(store.readerState()).toBe('unavailable');
    store.stop();
  });

  it('replaces the cache with newer live data after reconnect and from SSE', async () => {
    const { store, api, cache, listeners } = setup();
    store.start();
    await store.restoreCached();
    const fresh = {
      ...reading,
      readAt: '2026-09-04T03:05:00Z',
      windows: [{ ...reading.windows[0], remainingPercent: 29 }],
    };
    api.usageLimits.mockReturnValue(of(fresh));
    globalThis.dispatchEvent(new Event('online'));
    expect(store.state()).toBe('available');
    const newest = { ...fresh, readAt: '2026-09-04T03:06:00Z' };
    listeners.get('allowance')?.(new MessageEvent('allowance', { data: JSON.stringify(newest) }));
    expect(store.snapshot()?.readAt).toBe(newest.readAt);
    expect(cache.write).toHaveBeenLastCalledWith(newest);
    store.stop();
  });

  it('does not replace newer live data with a late cache read or older REST reply', async () => {
    const { store, api } = setup();
    const request = new Subject<UsageLimitsSnapshotDto>();
    api.usageLimits.mockReturnValue(request);
    store.start();
    const newest = { ...reading, readAt: '2026-09-04T04:00:00Z', cursor: 'newest' };
    store.acceptSnapshot(newest);
    await store.restoreCached();
    request.next(reading);
    expect(store.snapshot()).toEqual(newest);
    store.stop();
  });

  it('never changes saved percentages or the reading time when the reset date passes', () => {
    const { store } = setup(null);
    store.acceptSnapshot(reading);
    store.markDisconnected();
    store.resetLabel(reading.windows[0], new Date('2027-01-01T00:00:00Z'));
    expect(store.windows()[0].remainingPercent).toBe(37);
    expect(store.snapshot()?.readAt).toBe(reading.readAt);
  });
});
