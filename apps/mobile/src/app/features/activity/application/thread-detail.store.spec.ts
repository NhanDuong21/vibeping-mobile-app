import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiClient, type ActivityEventDto, type EventFeedDto } from '../../../core/api/api-client';
import { MobileSnapshotStorage } from '../../../core/cache/mobile-snapshot-storage';
import { ActivityStore } from './activity.store';
import { ThreadDetailStore } from './thread-detail.store';

describe('Thread detail data', () => {
  function setup() {
    const events = signal<ActivityEventDto[]>([]);
    const api = { threadTurns: vi.fn() };
    const readDetail = vi.fn();
    const cache = {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        ThreadDetailStore,
        { provide: ApiClient, useValue: api },
        { provide: MobileSnapshotStorage, useValue: cache },
        {
          provide: ActivityStore,
          useValue: {
            events,
            threads: events,
            readDetail,
            now: () => new Date(),
            isStale: () => false,
          },
        },
      ],
    });
    return { store: TestBed.inject(ThreadDetailStore), api, cache, readDetail };
  }

  it('rejects a late response for another thread and keeps retry available offline', async () => {
    const { store, api } = setup();
    const first = new Subject<EventFeedDto>();
    api.threadTurns
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(of({ events: [], nextCursor: null, unreadCount: 0 }));
    const opening = store.open('a');
    await vi.waitFor(() => expect(api.threadTurns).toHaveBeenCalledWith('a'));
    await store.open('b');
    first.next({ events: [], nextCursor: '10', unreadCount: 0 });
    first.complete();
    await opening;
    expect(store.hasMore()).toBe(false);
    api.threadTurns.mockReturnValue(throwError(() => new Error('offline')));
    await store.refresh();
    expect(store.state()).toBe('missing');
  });

  it('serializes older-page loads and does not advance the cursor after failure', async () => {
    const { store, api } = setup();
    api.threadTurns.mockReturnValueOnce(of({ events: [], nextCursor: '11', unreadCount: 0 }));
    await store.open('a');
    const page = new Subject<EventFeedDto>();
    api.threadTurns.mockReturnValue(page);
    const loading = store.loadMore();
    await store.loadMore();
    expect(api.threadTurns).toHaveBeenCalledTimes(2);
    page.error(new Error('offline'));
    await loading;
    expect(store.loadingMore()).toBe(false);
    expect(store.hasMore()).toBe(true);
  });

  it('includes an exact notification request outside the latest page, but rejects a different work', async () => {
    const { store, api, readDetail } = setup();
    const at = '2026-09-04T12:00:00Z';
    const old: ActivityEventDto = {
      id: 'old',
      title: 'Công việc',
      summary: 'Kết quả',
      projectName: 'fixture',
      occurredAt: at,
      isRead: true,
      eventType: 'codex.turn.completed',
      session: {
        eventIds: ['old'],
        state: 'completed',
        startedAt: at,
        completedAt: at,
        updatedAt: at,
        failedTestCount: 0,
        timeline: [],
        thread: {
          id: 'a',
          title: 'Công việc',
          turnCount: 12,
          turnNumber: 1,
          latestTurnId: 'latest',
          firstSignalAt: at,
          updatedAt: at,
          failedTestCount: 0,
          isRead: true,
        },
      },
    };
    api.threadTurns.mockReturnValue(of({ events: [], nextCursor: '3', unreadCount: 0 }));
    readDetail.mockResolvedValue({ event: old, cached: false });
    await store.open('a', 'old');
    expect(store.target()).toBe('old');
    expect(store.turns().map((event) => event.id)).toEqual(['old']);
    expect(store.hasMore()).toBe(true);
    await store.open('b', 'old');
    expect(store.turns()).toEqual([]);
  });
});
