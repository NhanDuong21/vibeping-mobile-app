const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function relativeTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  if (elapsed < MINUTE_MS) return 'Vừa xong';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} phút trước`;
  if (sameDay(date, now)) return `${Math.floor(elapsed / HOUR_MS)} giờ trước`;
  if (isYesterday(date, now)) return `Hôm qua, ${clock(date)}`;
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function relativeSignalTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  if (elapsed < DAY_MS || isYesterday(date, now)) return relativeTime(value, now);
  const days = Math.max(1, Math.round(elapsed / DAY_MS));
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

export function elapsedTime(value: string, now = new Date()): string {
  const elapsed = now.getTime() - Date.parse(value);
  return Number.isFinite(elapsed)
    ? `Đã theo dõi ${durationWithSeconds(elapsed)}`
    : 'Chưa ghi nhận thời gian';
}

export function durationWithSeconds(elapsed: number): string {
  if (!Number.isFinite(elapsed)) return 'Chưa ghi nhận thời gian';
  const seconds = Math.floor(Math.max(0, elapsed) / 1000);
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.floor(seconds / 60);
  const remainder = `${minutes % 60} phút ${seconds % 60} giây`;
  return minutes < 60 ? remainder : `${Math.floor(minutes / 60)} giờ ${remainder}`;
}

export function dateGroup(value: string, now = new Date()): string {
  const date = new Date(value);
  if (sameDay(date, now)) return 'Hôm nay';
  if (isYesterday(date, now)) return 'Hôm qua';
  const label = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  }).format(date);
  return label.charAt(0).toLocaleUpperCase('vi-VN') + label.slice(1);
}

export function exactDateTime(value: string): string {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  }).format(date);
  const capitalized = day.charAt(0).toLocaleUpperCase('vi-VN') + day.slice(1);
  return `${clock(date)}, ${capitalized}`;
}

export function clock(value: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isYesterday(value: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return sameDay(value, yesterday) && now.getTime() - value.getTime() < 2 * DAY_MS;
}
