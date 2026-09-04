import { TestBed } from '@angular/core/testing';
import { PersonalApi } from '../data/personal-api';
import { WindowsReadinessStore } from './windows-readiness.store';

describe('Windows readiness freshness', () => {
  const healthy = () => ({
    enabled: true,
    autoStart: true,
    state: 'healthy',
    checkedAt: new Date().toISOString(),
    recoveryCount: 0,
    trayAvailable: true,
  });
  const setup = () => {
    const api = { ready: vi.fn().mockResolvedValue(healthy()) };
    TestBed.configureTestingModule({
      providers: [WindowsReadinessStore, { provide: PersonalApi, useValue: api }],
    });
    return { api, store: TestBed.inject(WindowsReadinessStore) };
  };
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('invalidates on hide and checks the stopped host before claiming readiness on return', async () => {
    const { api, store } = setup();
    await store.load();
    expect(store.label()).toBe('Laptop đang sẵn sàng');
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.state()).toBe('stale');
    expect(store.lastCheck()).toMatch(/^Lần kiểm tra trước:/);
    api.ready.mockRejectedValue(new Error('offline'));
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.label()).toBe('Đang kiểm tra…');
    await Promise.resolve();
    expect(store.label()).toBe('Chưa kiểm tra được laptop');
    expect(store.lastCheck()).toMatch(/^Lần kiểm tra trước:/);
  });
  it('refreshes an open page and removes its timer and listeners when leaving Settings', async () => {
    vi.useFakeTimers();
    const { api, store } = setup();
    await store.load();
    api.ready.mockRejectedValue(new Error('offline'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(store.state()).toBe('unavailable');
    expect(api.ready).toHaveBeenCalledTimes(2);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(60_000);
    globalThis.dispatchEvent(new Event('pageshow'));
    expect(api.ready).toHaveBeenCalledTimes(2);
  });
  it('accepts a fresh disabled state but marks an expired healthy heartbeat stale', async () => {
    const { api, store } = setup();
    api.ready.mockResolvedValue({ ...healthy(), enabled: false, checkedAt: null });
    await store.load();
    expect(store.label()).toBe('Chưa bật Sẵn sàng');
    api.ready.mockResolvedValue({
      ...healthy(),
      checkedAt: new Date(Date.now() - 80_000).toISOString(),
    });
    globalThis.dispatchEvent(new Event('pageshow'));
    await Promise.resolve();
    expect(store.state()).toBe('stale');
  });
});
