import {
  dateGroup,
  durationWithSeconds,
  elapsedTime,
  exactDateTime,
  relativeSignalTime,
  relativeTime,
} from './time';

describe('Vietnamese time presentation', () => {
  const now = new Date('2026-09-04T12:00:00+07:00');

  it('uses short relative time for fresh activity', () => {
    expect(relativeTime('2026-09-04T11:59:45+07:00', now)).toBe('Vừa xong');
    expect(relativeTime('2026-09-04T11:55:00+07:00', now)).toBe('5 phút trước');
    expect(relativeTime('2026-09-04T10:00:00+07:00', now)).toBe('2 giờ trước');
    expect(relativeTime('2026-09-03T23:10:00+07:00', now)).toBe('Hôm qua, 23:10');
  });

  it('groups dates and formats elapsed and exact detail time', () => {
    expect(dateGroup('2026-09-04T08:00:00+07:00', now)).toBe('Hôm nay');
    expect(dateGroup('2026-09-03T08:00:00+07:00', now)).toBe('Hôm qua');
    expect(elapsedTime('2026-09-04T11:52:00+07:00', now)).toBe('Đã theo dõi 8 phút 0 giây');
    expect(exactDateTime('2026-09-03T23:06:00+07:00')).toContain('23:06');
    expect(relativeSignalTime('2026-09-02T08:00:00+07:00', now)).toBe('2 ngày trước');
  });

  it('keeps seconds at minute and hour boundaries without negative or invalid numbers', () => {
    for (const [seconds, expected] of [
      [-1, '0 giây'],
      [0, '0 giây'],
      [59, '59 giây'],
      [60, '1 phút 0 giây'],
      [61, '1 phút 1 giây'],
      [3599, '59 phút 59 giây'],
      [3600, '1 giờ 0 phút 0 giây'],
      [3661, '1 giờ 1 phút 1 giây'],
    ] as const)
      expect(durationWithSeconds(seconds * 1000)).toBe(expected);
    expect(durationWithSeconds(Number.NaN)).toBe('Chưa ghi nhận thời gian');
  });
});
