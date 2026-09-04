import type { ActivityEventDto } from '../../../core/api/api-client';
import {
  activityLabel,
  activityDescription,
  activityProject,
  activityTaskTitle,
  activityPreview,
  timelineLabel,
  groupActivityEvents,
} from './activity-presentation';

const event: ActivityEventDto = {
  id: 'event',
  eventType: 'codex.turn.completed',
  title: 'Codex đã hoàn tất',
  summary: 'Công việc đã hoàn tất trên laptop.',
  projectName: 'vibeping-mobile-app',
  occurredAt: '2026-09-04T11:55:00+07:00',
  isRead: false,
};

describe('activity presentation', () => {
  it('filters technical review output from legacy previews and uses current request terminology', () => {
    expect(activityPreview({ ...event, resultExcerpt: 'disposition: ship' })).toBe(
      'Đã có kết quả từ Codex',
    );
    expect(activityPreview({ ...event, summary: 'verdict: recapture' })).toMatch(
      /^Công việc VibePing · /,
    );
    expect(timelineLabel({ eventType: 'codex.turn.stopped', occurredAt: event.occurredAt })).toBe(
      'Yêu cầu đã dừng',
    );
  });
  it('explains legacy failed-test events as recorded project checks, with the right place to inspect them', () => {
    const failed = {
      ...event,
      eventType: 'codex.test.failed',
      summary: 'Codex đã dừng với một kiểm tra chưa đạt.',
    };
    expect(activityLabel(failed)).toBe('Kiểm thử mã nguồn chưa đạt');
    expect(activityDescription(failed)).toContain('tại thời điểm thông báo');
    expect(activityDescription(failed)).toContain('mở Codex trên laptop');
    expect(activityTaskTitle(failed)).toBe('Lần kiểm thử Codex ghi nhận chưa đạt');
  });
  it('uses a safe fallback when no task title was stored', () => {
    expect(activityLabel(event)).toBe('Công việc đã hoàn tất');
    expect(activityTaskTitle(event)).toBe('Công việc trong Codex');
  });

  it('uses a richer safe summary without duplicating the project name', () => {
    const richer = { ...event, summary: 'Hoàn thiện trải nghiệm Hoạt động' };
    expect(activityTaskTitle(richer)).toBe('Hoàn thiện trải nghiệm Hoạt động');
    expect(activityDescription(richer)).toBe(
      'Codex đã kết thúc yêu cầu này nhưng VibePing chưa có nội dung kết quả. Mở Codex trên laptop để xem.',
    );
    expect(activityTaskTitle({ ...event, summary: event.projectName })).toBe(
      'Công việc trong Codex',
    );
  });

  it('keeps paths and control characters out of visible activity context', () => {
    const unsafe = {
      ...event,
      summary: 'C:\\Users\\Lan\\secret.txt',
      projectName: 'C:\\work\\vibeping-mobile-app\u0000',
    };
    expect(activityTaskTitle(unsafe)).toBe('Công việc trong Codex');
    expect(activityProject(unsafe)).toBe('vibeping-mobile-app');
    expect(activityDescription(unsafe)).toBe(
      'Codex đã kết thúc yêu cầu này nhưng VibePing chưa có nội dung kết quả. Mở Codex trên laptop để xem.',
    );
  });

  it('keeps a long Vietnamese work title useful and bounded', () => {
    const title = 'Hoàn thiện trải nghiệm Hoạt động trên iPhone '.repeat(8);
    const presented = activityTaskTitle({ ...event, summary: title });
    expect(presented).toContain('Hoàn thiện trải nghiệm Hoạt động');
    expect(presented.length).toBe(180);
  });

  it('groups the feed into Vietnamese dates', () => {
    const groups = groupActivityEvents(
      [event, { ...event, id: 'yesterday', occurredAt: '2026-09-03T23:00:00+07:00' }],
      new Date('2026-09-04T12:00:00+07:00'),
    );
    expect(groups.map((group) => group.label)).toEqual(['Hôm nay', 'Hôm qua']);
  });
});
