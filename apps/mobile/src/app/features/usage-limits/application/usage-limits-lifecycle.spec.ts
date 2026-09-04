import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { UsageLimitsCache } from '../data/usage-limits-cache';
import { UsageLimitsStore } from './usage-limits.store';

const snapshot = {
  state: 'available',
  readAt: new Date(2026, 8, 4, 8, 0, 7).toISOString(),
  cursor: '1',
  windows: [
    {
      windowKey: 'test',
      label: 'Lượt dùng 5 giờ',
      windowKind: 'primary',
      remainingPercent: 37,
      durationMinutes: 300,
      resetsAt: 2_000_000_000,
      reached: false,
    },
  ],
};

function setup() {
  const streams: (EventTarget & { close: ReturnType<typeof vi.fn> })[] = [];
  const factory = vi.fn(() => {
    const stream = Object.assign(new EventTarget(), { close: vi.fn() });
    streams.push(stream);
    return stream;
  });
  const api = { usageLimits: vi.fn().mockReturnValue(of(snapshot)) };
  TestBed.configureTestingModule({
    providers: [
      { provide: ApiClient, useValue: api },
      { provide: EVENT_SOURCE_FACTORY, useValue: factory },
      {
        provide: UsageLimitsCache,
        useValue: { read: vi.fn().mockResolvedValue(null), write: vi.fn() },
      },
    ],
  });
  const store = TestBed.inject(UsageLimitsStore);
  store.start();
  return { store, api, streams, factory };
}

describe('allowance foreground reader', () => {
  afterEach(() => vi.restoreAllMocks());

  it('releases the fast-read subscription in the background and ignores its late messages', () => {
    const { store, api, streams, factory } = setup();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(streams[0].close).toHaveBeenCalledOnce();
    streams[0].dispatchEvent(
      new MessageEvent('allowance', {
        data: JSON.stringify({
          ...snapshot,
          readAt: '2099-01-01T00:00:00Z',
          windows: [{ ...snapshot.windows[0], remainingPercent: 1 }],
        }),
      }),
    );
    expect(store.windows()[0].remainingPercent).toBe(37);
    expect(api.usageLimits).toHaveBeenCalledOnce();
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(factory).toHaveBeenCalledTimes(2);
    expect(api.usageLimits).toHaveBeenCalledTimes(2);
    store.stop();
    expect(streams[1].close).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('online'));
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('releases an offline stream and reconnects without changing the saved numbers', () => {
    const { store, streams, factory } = setup();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    expect(streams[0].close).toHaveBeenCalledOnce();
    expect(store.state()).toBe('stale');
    expect(store.windows()[0].remainingPercent).toBe(37);
    online.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(factory).toHaveBeenCalledTimes(2);
    expect(store.state()).toBe('available');
    store.stop();
  });

  it('shows seconds so successive real reads within a minute are distinguishable', () => {
    const { store } = setup();
    expect(store.lastReadLabel()).toContain('08:00:07');
    store.acceptSnapshot({ ...snapshot, readAt: new Date(2026, 8, 4, 8, 0, 22).toISOString() });
    expect(store.lastReadLabel()).toContain('08:00:22');
    store.stop();
  });
});
