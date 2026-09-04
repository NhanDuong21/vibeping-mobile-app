import { TestBed } from '@angular/core/testing';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { ActivityLiveConnection } from './activity-live-connection';

function setup() {
  const streams: (EventTarget & { close: ReturnType<typeof vi.fn>; readyState: number })[] = [];
  const factory = vi.fn(() => {
    const stream = Object.assign(new EventTarget(), { close: vi.fn(), readyState: 1 });
    streams.push(stream);
    return stream;
  });
  TestBed.configureTestingModule({
    providers: [{ provide: EVENT_SOURCE_FACTORY, useValue: factory }],
  });
  const live = TestBed.inject(ActivityLiveConnection);
  const receive = vi.fn();
  live.events.subscribe(receive);
  live.start();
  return { live, streams, factory, receive };
}

describe('foreground activity transport', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('replaces a silently stalled stream and ignores messages from its closed predecessor', () => {
    const { live, streams, factory, receive } = setup();
    streams[0].dispatchEvent(new Event('connected'));
    expect(live.connected()).toBe(true);
    vi.advanceTimersByTime(45_000);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(streams[0].close).toHaveBeenCalledOnce();
    receive.mockClear();
    streams[0].dispatchEvent(new MessageEvent('work', { data: 'null' }));
    expect(receive).not.toHaveBeenCalled();
    streams[1].dispatchEvent(new MessageEvent('work', { data: 'null' }));
    expect(receive).toHaveBeenCalledWith(expect.objectContaining({ type: 'work' }));
    live.stop();
  });

  it('uses heartbeats as connection evidence without extending Codex work freshness', () => {
    const { live, streams, factory, receive } = setup();
    for (let index = 0; index < 6; index++) {
      vi.advanceTimersByTime(15_000);
      streams[0].dispatchEvent(new Event('heartbeat'));
    }
    expect(factory).toHaveBeenCalledOnce();
    expect(live.connected()).toBe(true);
    expect(receive.mock.calls.every(([message]) => message.type === 'reconcile')).toBe(true);
    live.stop();
  });

  it('pauses in the background and opens one fresh connection when returning', () => {
    const { live, streams, factory, receive } = setup();
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(streams[0].close).toHaveBeenCalledOnce();
    receive.mockClear();
    const pausedAt = live.now();
    vi.advanceTimersByTime(120_000);
    expect(live.now()).toEqual(pausedAt);
    expect(receive).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(factory).toHaveBeenCalledTimes(2);
    expect(live.now().getTime()).toBe(Date.now());
    expect(receive).toHaveBeenCalledWith({ type: 'reconcile' });
    live.stop();
  });

  it('does no network work offline and reconnects when the network returns', () => {
    const { live, factory, receive } = setup();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    receive.mockClear();
    const pausedAt = live.now();
    vi.advanceTimersByTime(60_000);
    expect(live.now()).toEqual(pausedAt);
    expect(factory).toHaveBeenCalledOnce();
    expect(receive).not.toHaveBeenCalled();
    online.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(factory).toHaveBeenCalledTimes(2);
    expect(receive).toHaveBeenCalledWith({ type: 'reconcile' });
    live.stop();
  });

  it('ticks each second without increasing network reconciliation and stops on teardown', () => {
    const { live, factory, receive } = setup();
    live.start();
    const start = live.now().getTime();
    vi.advanceTimersByTime(1000);
    expect(live.now().getTime()).toBe(start + 1000);
    vi.advanceTimersByTime(13_000);
    expect(live.now().getTime()).toBe(start + 14_000);
    expect(receive).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    expect(receive).toHaveBeenCalledExactlyOnceWith({ type: 'reconcile' });
    live.stop();
    const stoppedAt = live.now();
    vi.advanceTimersByTime(30_000);
    expect(live.now()).toEqual(stoppedAt);
    expect(vi.getTimerCount()).toBe(0);
  });
});
