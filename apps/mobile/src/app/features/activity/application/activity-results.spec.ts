import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { ActivityCache, isCachedActivity } from '../data/activity-cache';
import { ActivityStore } from './activity.store';

const event = {
  id: 'result-event',
  eventType: 'codex.turn.completed',
  title: 'Codex đã xong',
  summary: 'Sửa bộ lọc',
  projectName: 'sample',
  occurredAt: '2026-09-04T08:00:00Z',
  isRead: false,
};
const answer = {
  ...event,
  resultExcerpt: 'Đã sửa bộ lọc.',
  result: { text: 'Đã sửa bộ lọc.\nKiểm thử đã qua.', truncated: false },
  timeline: [],
};
const bootstrap = {
  serverTime: event.occurredAt,
  connection: { desktop: 'running', codex: 'ready', privateConnection: 'local' },
  cursor: '1',
  currentWork: null,
  unreadCount: 1,
  usageLimits: { state: 'available', readAt: null, windows: [], cursor: '1' },
};

async function setup(saved: unknown = null) {
  const listeners = new Map<string, EventListener>();
  const api = {
    bootstrap: vi.fn().mockReturnValue(of(bootstrap)),
    events: vi.fn().mockReturnValue(of({ events: [event], nextCursor: null, unreadCount: 1 })),
    event: vi.fn().mockReturnValue(of({ ...event, timeline: [] })),
    pairingStatus: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
  };
  const cache = {
    read: vi.fn().mockResolvedValue(saved),
    write: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: ApiClient, useValue: api },
      { provide: ActivityCache, useValue: cache },
      {
        provide: EVENT_SOURCE_FACTORY,
        useValue: () => ({
          addEventListener: (name: string, listener: EventListener) =>
            listeners.set(name, listener),
          close: vi.fn(),
        }),
      },
    ],
  });
  const store = TestBed.inject(ActivityStore);
  store.start();
  await vi.waitFor(() => expect(store.events()).toHaveLength(1));
  return { store, api, cache, listeners };
}

describe('Completed task results', () => {
  it('enriches the open detail immediately and retains the viewed answer across feed refresh and offline cache', async () => {
    const { store, api, cache, listeners } = await setup();
    await store.loadDetail(event.id);
    api.event.mockReturnValue(of(answer));
    listeners.get('activity')?.(new MessageEvent('activity', { data: JSON.stringify(answer) }));
    await vi.waitFor(() => expect(store.selected()?.result?.text).toBe(answer.result.text));
    expect(store.events()).toHaveLength(1);
    expect(store.unreadCount()).toBe(0);
    const saved = cache.write.mock.calls.at(-1)?.[0];
    expect(isCachedActivity(saved)).toBe(true);
    expect(saved.events[0].result.text).toBe(answer.result.text);
    store.stop();
    TestBed.resetTestingModule();
    const offline = await setup(saved);
    offline.api.event.mockReturnValue(throwError(() => new Error('offline')));
    await offline.store.loadDetail(event.id);
    expect(offline.store.selected()?.result?.text).toBe(answer.result.text);
    expect(offline.store.detailState()).toBe('ready');
    offline.store.stop();
  });

  it('does not let a late HTTP answer replace a different open event', async () => {
    const { store, api } = await setup();
    const delayed = new Subject<typeof answer>();
    api.event.mockReturnValueOnce(delayed);
    const first = store.loadDetail(event.id);
    await vi.waitFor(() => expect(api.event).toHaveBeenCalledTimes(1));
    api.event.mockReturnValue(of({ ...answer, id: 'other' }));
    await store.loadDetail('other');
    delayed.next(answer);
    delayed.complete();
    await first;
    expect(store.selected()?.id).toBe('other');
    store.stop();
  });

  it('rejects damaged cached answer shapes while accepting earlier cache records', () => {
    const cached = {
      savedAt: event.occurredAt,
      currentWork: null,
      usageLimits: bootstrap.usageLimits,
      unreadCount: 0,
      events: [event],
      nextCursor: null,
      pendingReadIds: [],
      pendingReadAll: false,
    };
    expect(isCachedActivity(cached)).toBe(true);
    expect(isCachedActivity({ ...cached, events: [{ ...answer, result: { text: 7 } }] })).toBe(
      false,
    );
    expect(isCachedActivity({ ...cached, events: [{ ...answer, timeline: [null] }] })).toBe(false);
  });
});
