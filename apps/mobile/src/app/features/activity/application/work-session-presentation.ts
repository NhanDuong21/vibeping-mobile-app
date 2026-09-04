import type { ActivityEventDto } from '../../../core/api/api-client';

export function sessionIsWorking(
  event: ActivityEventDto | null,
  now: Date,
  stale = false,
): boolean {
  const session = event?.session;
  if (!session || stale || session.state !== 'running' || session.completedAt) return false;
  const age = now.getTime() - Date.parse(session.updatedAt);
  return Number.isFinite(age) && age >= -30_000 && age < 120_000;
}

export function sessionStatus(event: ActivityEventDto, now: Date, stale = false): string {
  const session = event.session;
  if (!session) return '';
  if (!session.completedAt && (stale || now.getTime() - Date.parse(session.updatedAt) >= 120_000))
    return stale ? 'Dữ liệu đã lưu' : 'Không còn tín hiệu mới';
  const labels: Record<string, string> = {
    running: 'Đang làm việc',
    waiting: 'Cần chú ý',
    completed: 'Đã hoàn tất',
    stopped: 'Đã dừng',
    failed: 'Cần chú ý',
    unconfirmed: 'Không còn tín hiệu mới',
  };
  return labels[session.state] ?? 'Đã ghi nhận';
}

export function sessionDuration(event: ActivityEventDto, now: Date, stale = false): string {
  const session = event.session;
  if (!session?.startedAt) return 'Chưa ghi nhận lúc bắt đầu';
  const unconfirmed =
    stale ||
    session.state === 'unconfirmed' ||
    now.getTime() - Date.parse(session.updatedAt) >= 120_000;
  const end = session.completedAt ?? (unconfirmed ? session.updatedAt : now.toISOString());
  const minutes = Math.floor(Math.max(0, Date.parse(end) - Date.parse(session.startedAt)) / 60_000);
  const duration =
    minutes < 1
      ? 'Dưới 1 phút'
      : minutes < 60
        ? `${minutes} phút`
        : `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
  return !session.completedAt && unconfirmed ? `${duration} đến tín hiệu cuối` : duration;
}

export function sessionRevision(event: ActivityEventDto): string {
  const last = event.session?.timeline.at(-1);
  return last ? `${event.id}:${last.eventType}:${last.occurredAt}` : event.id;
}
