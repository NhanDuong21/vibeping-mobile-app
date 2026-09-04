import type { ActivityEventDto } from '../../../core/api/api-client';
import { mergeEvents } from './activity-reconciliation';
import { sessionDuration, sessionStatus } from './work-session-presentation';

const event: ActivityEventDto = {
  id: 'session',
  eventType: 'codex.turn.started',
  title: 'Bắt đầu',
  summary: 'Sửa bộ lọc',
  projectName: 'sample',
  occurredAt: '2026-09-04T06:10:00Z',
  isRead: true,
  session: {
    eventIds: ['legacy-completion'],
    state: 'running',
    startedAt: '2026-09-04T06:00:00Z',
    updatedAt: '2026-09-04T06:10:00Z',
    completedAt: null,
    failedTestCount: 1,
    timeline: [],
  },
};

describe('Work session presentation', () => {
  it('stops elapsed time and removes live claims when signals become stale or offline', () => {
    const now = new Date('2026-09-04T06:11:00Z');
    expect(sessionStatus(event, now)).toBe('Đang làm việc');
    expect(sessionDuration(event, now)).toBe('11 phút');
    expect(sessionStatus(event, now, true)).toBe('Dữ liệu đã lưu');
    expect(sessionDuration(event, new Date('2026-09-04T07:11:00Z'))).toBe(
      '10 phút đến tín hiệu cuối',
    );
  });

  it('keeps completion duration fixed and does not invent an unobserved start', () => {
    const completed = {
      ...event,
      session: { ...event.session!, state: 'completed', completedAt: '2026-09-04T06:18:00Z' },
    };
    expect(sessionDuration(completed, new Date('2026-09-05'))).toBe('18 phút');
    expect(
      sessionDuration(
        { ...completed, session: { ...completed.session, startedAt: null } },
        new Date(),
      ),
    ).toBe('Chưa ghi nhận lúc bắt đầu');
  });

  it('updates the same card and reopens unread state only for a newer session revision', () => {
    expect(mergeEvents([event], [{ ...event, isRead: false }])[0].isRead).toBe(true);
    const next = {
      ...event,
      isRead: false,
      session: { ...event.session!, updatedAt: '2026-09-04T06:12:00Z' },
    };
    expect(mergeEvents([event], [next])).toEqual([next]);
    const lateResult = { ...next, isRead: true, resultExcerpt: 'Đã sửa xong.' };
    expect(mergeEvents([next], [lateResult])).toEqual([lateResult]);
  });
});
