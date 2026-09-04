import { mergeSessionFeed, type CachedEvent } from './session-cache-migration';

const old: CachedEvent = {
  id: 'completed-event',
  eventType: 'codex.turn.completed',
  title: 'Đã hoàn tất',
  summary: 'Đã sửa bộ lọc',
  projectName: 'sample',
  occurredAt: '2026-09-04T08:00:00Z',
  isRead: true,
  result: { text: 'Kết quả đã xem', truncated: false },
  timeline: [{ eventType: 'codex.turn.completed', occurredAt: '2026-09-04T08:00:00Z' }],
};
function session(id: string, eventIds: string[]): CachedEvent {
  const summary = { ...old };
  delete summary.result;
  delete summary.timeline;
  return {
    ...summary,
    id,
    session: {
      eventIds,
      state: 'completed',
      startedAt: null,
      completedAt: old.occurredAt,
      updatedAt: old.occurredAt,
      failedTestCount: 0,
      timeline: [],
    },
  };
}

describe('RC8 session cache migration', () => {
  it.each(['new-session', old.id])(
    'retains a viewed answer and timeline when the session id is %s',
    (id) => {
      const merged = mergeSessionFeed([old], [session(id, [old.id])], []);
      expect(merged.events).toHaveLength(1);
      expect(merged.events[0].id).toBe(id);
      expect(merged.events[0].result).toEqual(old.result);
      expect(merged.events[0].timeline).toEqual(old.timeline);
      expect(merged.legacy).toEqual([]);
    },
  );

  it('keeps older viewed answers outside the feed until their page arrives without joining different turns', () => {
    const first = mergeSessionFeed([old], [session('recent', ['another-event'])], []);
    expect(first.legacy).toEqual([old]);
    expect(first.events).toHaveLength(1);
    expect(first.events[0].result).toBeUndefined();
    const reloaded = JSON.parse(JSON.stringify(first)) as typeof first;
    const next = mergeSessionFeed(reloaded.events, [session('older', [old.id])], reloaded.legacy);
    expect(next.legacy).toEqual([]);
    expect(next.events).toHaveLength(2);
    expect(next.events.find((value) => value.id === 'older')?.result).toEqual(old.result);
  });
});
