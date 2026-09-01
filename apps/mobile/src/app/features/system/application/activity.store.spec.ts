import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { ActivityStore } from './activity.store';

describe('ActivityStore', () => {
  it('shows current work and refreshes after an SSE activity', () => {
    const listeners = new Map<string, EventListener>();
    const api = {
      activity: vi.fn().mockReturnValue(
        of({
          currentWork: {
            projectName: 'vibeping',
            state: 'running',
            startedAt: '2026-09-02T00:00:00Z',
            updatedAt: '2026-09-02T00:00:00Z',
          },
          events: [],
          cursor: '1',
        }),
      ),
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
        { provide: EVENT_SOURCE_FACTORY, useValue: () => stream },
      ],
    });
    const store = TestBed.inject(ActivityStore);
    store.start();
    expect(store.headline()).toBe('Codex đang làm việc');
    listeners.get('activity')?.(new Event('activity'));
    expect(api.activity).toHaveBeenCalledTimes(2);
    store.stop();
    expect(stream.close).toHaveBeenCalled();
  });
});
