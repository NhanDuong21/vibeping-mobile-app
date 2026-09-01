import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiClient, type BootstrapDto } from '../api/api-client';
import { ConnectivityStore } from './connectivity.store';
import { EVENT_SOURCE_FACTORY } from './event-source';

const snapshot: BootstrapDto = {
  connection: {
    codex: 'pending',
    desktop: 'running',
    privateConnection: 'local',
  },
  cursor: '1',
  serverTime: '2026-09-02T00:00:00Z',
  unreadCount: 0,
  usageLimits: {
    cursor: '1',
    readAt: null,
    state: 'unavailable',
    windows: [],
  },
};

class FakeEventSource {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly close = vi.fn();
  readonly addEventListener = vi.fn();
}

describe('ConnectivityStore', () => {
  it('moves from bootstrap to a live connection', () => {
    const source = new FakeEventSource();
    TestBed.configureTestingModule({
      providers: [
        ConnectivityStore,
        { provide: ApiClient, useValue: { bootstrap: () => of(snapshot) } },
        {
          provide: EVENT_SOURCE_FACTORY,
          useValue: () => source as unknown as EventSource,
        },
      ],
    });
    const store = TestBed.inject(ConnectivityStore);

    store.start();
    source.onopen?.(new Event('open'));

    expect(store.state()).toBe('online');
    expect(store.lastSync()?.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    store.stop();
    expect(source.close).toHaveBeenCalledOnce();
  });

  it('shows a recoverable offline state when bootstrap fails', () => {
    TestBed.configureTestingModule({
      providers: [
        ConnectivityStore,
        {
          provide: ApiClient,
          useValue: { bootstrap: () => throwError(() => new Error('offline')) },
        },
      ],
    });
    const store = TestBed.inject(ConnectivityStore);
    store.start();
    expect(store.view().detail).toBe('VibePing sẽ tự thử lại.');
  });
});
