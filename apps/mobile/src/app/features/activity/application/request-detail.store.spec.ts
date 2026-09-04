import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivityEventDetailDto } from '../../../core/api/api-client';
import { ActivityStore } from './activity.store';
import { RequestDetailStore } from './request-detail.store';

const answer = (id: string, text = `Kết quả đầy đủ của ${id}`): ActivityEventDetailDto => ({
  id,
  title: 'Công việc',
  projectName: 'fixture-project',
  summary: 'Kết quả',
  eventType: 'codex.turn.completed',
  occurredAt: '2026-09-04T12:00:00Z',
  isRead: true,
  timeline: [],
  resultExcerpt: text,
  result: { text, truncated: false },
});

describe('Inline request details', () => {
  function setup() {
    const events = signal<ActivityEventDetailDto[]>([answer('a'), answer('b')]);
    const readDetail = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ActivityStore, useValue: { events, readDetail } }],
    });
    const create = () => TestBed.runInInjectionContext(() => new RequestDetailStore());
    return { events, readDetail, create };
  }

  it('keeps independently expanded answers when responses arrive out of order', async () => {
    const { create, readDetail } = setup();
    let resolveA!: (value: { event: ActivityEventDetailDto; cached: boolean }) => void;
    readDetail.mockImplementation((id: string) =>
      id === 'a'
        ? new Promise((resolve) => {
            resolveA = resolve;
          })
        : Promise.resolve({ event: answer('b'), cached: false }),
    );
    const first = create();
    const second = create();
    first.open('a');
    second.open('b');
    TestBed.tick();
    await vi.waitFor(() => expect(second.event()?.id).toBe('b'));
    resolveA({ event: answer('a'), cached: false });
    await vi.waitFor(() => expect(first.event()?.id).toBe('a'));
    expect(second.event()?.result?.text).toContain('b');
  });

  it('does not fetch closed requests on live signals and retries cached answers on reopen', async () => {
    const { create, readDetail, events } = setup();
    readDetail.mockResolvedValue({ event: answer('a'), cached: true });
    const store = create();
    store.open('a');
    TestBed.tick();
    await vi.waitFor(() => expect(store.state()).toBe('cached'));
    store.close();
    TestBed.tick();
    readDetail.mockClear();
    events.set([answer('a', 'Nội dung vừa cập nhật')]);
    TestBed.tick();
    expect(readDetail).not.toHaveBeenCalled();
    readDetail.mockResolvedValue({ event: events()[0], cached: false });
    store.open('a');
    TestBed.tick();
    await vi.waitFor(() => expect(store.state()).toBe('ready'));
    expect(store.event()?.result?.text).toBe('Nội dung vừa cập nhật');
  });

  it('reads a signal arriving during HTTP once more without an endless stale-response loop', async () => {
    const { create, readDetail, events } = setup();
    let resolve!: (value: { event: ActivityEventDetailDto; cached: boolean }) => void;
    readDetail
      .mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValue({ event: answer('a'), cached: false });
    const store = create();
    store.open('a');
    TestBed.tick();
    events.set([answer('a', 'Kết quả mới hơn từ luồng cập nhật')]);
    TestBed.tick();
    resolve({ event: answer('a'), cached: false });
    await vi.waitFor(() => expect(readDetail).toHaveBeenCalledTimes(2));
    TestBed.tick();
    expect(readDetail).toHaveBeenCalledTimes(2);
  });

  it('rejects an obsolete response after the panel changes request', async () => {
    const { create, readDetail } = setup();
    let resolve!: (value: { event: ActivityEventDetailDto; cached: boolean }) => void;
    readDetail
      .mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValue({ event: null, cached: true });
    const store = create();
    store.open('a');
    store.open('b');
    resolve({ event: answer('a'), cached: false });
    await vi.waitFor(() => expect(store.state()).toBe('missing'));
    expect(store.event()).toBeNull();
    expect(readDetail).toHaveBeenLastCalledWith('b');
  });
});
