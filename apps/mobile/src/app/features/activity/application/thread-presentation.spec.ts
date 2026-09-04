import type { ActivityEventDto } from '../../../core/api/api-client';
import {
  groupThreads,
  needsAttention,
  resultPreview,
  threadSections,
  threadStatus,
  threadTitle,
  turnTitle,
} from './thread-presentation';
import { mergeEvents } from './activity-reconciliation';

const now = new Date('2026-09-04T12:00:00Z');
export function turn(id: string, threadId: string, number = 1): ActivityEventDto {
  return {
    id,
    title: 'Công việc',
    summary: 'Mở Codex trên laptop để xem kết quả',
    eventType: 'codex.turn.completed',
    projectName: 'same-repository',
    isRead: true,
    occurredAt: now.toISOString(),
    session: {
      eventIds: [id],
      state: 'completed',
      startedAt: null,
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      failedTestCount: 2,
      lastTestState: 'passed',
      timeline: [],
      thread: {
        id: threadId,
        title: null,
        turnCount: number,
        turnNumber: number,
        latestTurnId: id,
        previousTurnId: null,
        nextTurnId: null,
        firstSignalAt: now.toISOString(),
        startedAt: null,
        updatedAt: now.toISOString(),
        failedTestCount: 2,
        isRead: true,
      },
    },
  };
}

describe('Thread hierarchy', () => {
  it('keeps one latest turn per exact thread across pages and reconnects, even in the same project', () => {
    const one = turn('one', 'a', 1);
    const two = turn('two', 'a', 2);
    const separate = turn('separate', 'b');
    const grouped = groupThreads([one, separate, two, one, two]);
    expect(grouped).toHaveLength(2);
    expect(grouped.find((event) => event.session?.thread?.id === 'a')?.id).toBe('two');
    const late = { ...one, occurredAt: '2026-09-04T12:01:00Z' };
    expect(groupThreads([two, late])[0].id).toBe('two');
  });

  it('places a thread once, excludes the hero, and preserves unrelated legacy history', () => {
    const hero = turn('hero', 'a');
    const active = turn('live', 'b');
    active.session = { ...active.session!, state: 'running', completedAt: null };
    const failed = turn('failed', 'c');
    failed.session!.lastTestState = 'failed';
    const old = { ...turn('legacy', 'none'), session: undefined };
    const groups = threadSections([hero, active, failed, old], hero, now, false);
    expect(groups.map((group) => group.label)).toEqual([
      'Đang làm việc',
      'Cần chú ý',
      'Hoạt động cũ',
    ]);
    expect(groups.flatMap((group) => group.events)).toHaveLength(3);
    expect(groupThreads([old, { ...old, id: 'another-legacy' }])).toHaveLength(2);
  });

  it('historical failures are neutral after pass; current failures, waiting and lost signals need attention', () => {
    const event = turn('one', 'a');
    expect(needsAttention(event, now)).toBe(false);
    expect(threadStatus(event, now)).toBe('Đã hoàn tất');
    event.session!.lastTestState = 'failed';
    expect(needsAttention(event, now)).toBe(true);
    expect(threadStatus(event, now)).toBe('Cần chú ý');
    event.session!.lastTestState = 'passed';
    for (const state of ['waiting', 'stopped', 'unconfirmed']) {
      event.session!.state = state;
      event.session!.completedAt = null;
      expect(needsAttention(event, now)).toBe(true);
    }
    event.session!.state = 'running';
    event.session!.updatedAt = '2026-09-04T11:40:00Z';
    expect(threadStatus(event, now)).toBe('Không còn tín hiệu mới');
  });

  it('uses safe metadata titles only, never a result or operational fallback', () => {
    const event = turn('one', 'a', 6);
    expect(threadTitle(event)).toMatch(/^Công việc VibePing · /);
    expect(turnTitle(event)).toMatch(/^Công việc VibePing · /);
    event.session!.thread!.title = 'Hoàn thiện màn Hoạt động';
    expect(threadTitle(event)).toBe('Hoàn thiện màn Hoạt động');
    for (const resultExcerpt of ['verdict', 'disposition: ship', 'OK', '```\npass\n```']) {
      expect(resultPreview({ ...event, resultExcerpt })).toBe('Đã có kết quả từ Codex');
    }
    expect(
      resultPreview({
        ...event,
        resultExcerpt: 'Đã thêm phiên làm việc vào ứng dụng.\nChi tiết phía dưới.',
      }),
    ).toBe('Đã thêm phiên làm việc vào ứng dụng.');
  });

  it('does not roll a newer live turn back when a stale REST response arrives', () => {
    const event = turn('one', 'a');
    const old = {
      ...event,
      session: { ...event.session!, state: 'running', updatedAt: '2026-09-04T11:59:00Z' },
    };
    expect(mergeEvents([event], [old])[0].session?.state).toBe('completed');
  });
});
