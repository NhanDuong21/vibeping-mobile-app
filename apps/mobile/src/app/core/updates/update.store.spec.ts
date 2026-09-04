import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { UpdateStore } from './update.store';

describe('UpdateStore', () => {
  afterEach(() => vi.useRealTimers());

  it('offers a deliberate update only after the new shell is ready', () => {
    const events = new Subject<{
      type: 'VERSION_READY';
      currentVersion: { hash: string };
      latestVersion: { hash: string };
    }>();
    TestBed.configureTestingModule({
      providers: [
        UpdateStore,
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: events,
            activateUpdate: vi.fn().mockResolvedValue(true),
            checkForUpdate: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    });
    const store = TestBed.inject(UpdateStore);
    store.start();
    expect(store.available()).toBe(false);
    events.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
    expect(store.available()).toBe(true);
    store.stop();
  });

  it('checks on startup, foreground and reconnect, retries offline and cleans up', async () => {
    vi.useFakeTimers();
    const events = new Subject<VersionEvent>();
    const checkForUpdate = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(false);
    TestBed.configureTestingModule({
      providers: [
        UpdateStore,
        {
          provide: SwUpdate,
          useValue: { isEnabled: true, versionUpdates: events, checkForUpdate },
        },
      ],
    });
    const store = TestBed.inject(UpdateStore);
    store.start();
    store.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
    globalThis.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(4);
    events.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new', appData: { version: '1.0.0-rc.2' } },
    });
    expect(store.version()).toBe('1.0.0-rc.2');
    expect(store.available()).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(4);
    store.stop();
    document.dispatchEvent(new Event('visibilitychange'));
    globalThis.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(4);
  });

  it('does not start checks when service workers are unavailable', () => {
    const checkForUpdate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        UpdateStore,
        {
          provide: SwUpdate,
          useValue: { isEnabled: false, checkForUpdate },
        },
      ],
    });
    const store = TestBed.inject(UpdateStore);
    store.start();
    expect(checkForUpdate).not.toHaveBeenCalled();
    store.stop();
  });
});
