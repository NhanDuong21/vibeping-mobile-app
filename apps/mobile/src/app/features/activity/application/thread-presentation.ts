import type { ActivityEventDto } from '../../../core/api/api-client';
import { workName, workPreview } from './work-copy';
import { dateGroup } from '../../../core/formatting/time';
import { activityTaskTitle, timelineLabel } from './activity-presentation';
import { sessionIsWorking, sessionStatus } from './work-session-presentation';

export const threadIdentity = (event: ActivityEventDto): string =>
  event.session?.thread?.id ?? event.id;
export const threadTime = (event: ActivityEventDto): string =>
  event.session?.thread?.updatedAt ?? event.occurredAt;
export const threadTitle = (event: ActivityEventDto): string =>
  workName(
    event.session?.thread?.title ??
      event.session?.taskLabel ??
      (event.session ? null : activityTaskTitle(event)),
    threadTime(event),
  );
export const turnTitle = (event: ActivityEventDto): string =>
  workName(event.session?.taskLabel, event.occurredAt);

/** Server totals describe the entire retained thread, even with only one turn cached. */
export function groupThreads(events: ActivityEventDto[]): ActivityEventDto[] {
  const threads = new Map<string, ActivityEventDto>();
  for (const event of events) {
    const key = threadIdentity(event);
    const previous = threads.get(key);
    const number = event.session?.thread?.turnNumber ?? 0;
    const previousNumber = previous?.session?.thread?.turnNumber ?? 0;
    if (
      !previous ||
      number > previousNumber ||
      (number === previousNumber && Date.parse(event.occurredAt) > Date.parse(previous.occurredAt))
    ) {
      threads.set(key, event);
    }
  }
  return [...threads.values()].sort(
    (a, b) =>
      Date.parse(threadTime(b)) - Date.parse(threadTime(a)) ||
      threadIdentity(b).localeCompare(threadIdentity(a)),
  );
}

export function threadStatus(event: ActivityEventDto, now: Date, stale = false): string {
  if (needsAttention(event, now, stale)) {
    if (event.session?.state === 'stopped') return 'Đã dừng';
    if (
      event.session?.state === 'unconfirmed' ||
      (!event.session?.completedAt &&
        !sessionIsWorking(event, now, stale) &&
        event.session?.state !== 'waiting')
    )
      return 'Không còn tín hiệu mới';
    return 'Cần chú ý';
  }
  return event.session?.state === 'completed' ? 'Đã hoàn tất' : sessionStatus(event, now, stale);
}

export function needsAttention(event: ActivityEventDto, now: Date, stale = false): boolean {
  const turn = event.session;
  if (!turn) return false;
  if (turn.lastTestState === 'failed' || ['failed', 'stopped', 'waiting'].includes(turn.state))
    return true;
  return (
    !turn.completedAt && (turn.state === 'unconfirmed' || (!stale && !sessionIsWorking(event, now)))
  );
}

export function attentionNote(event: ActivityEventDto, now: Date): string {
  const turn = event.session;
  if (turn?.lastTestState === 'failed' || turn?.state === 'failed')
    return 'Lần kiểm thử gần nhất vẫn chưa đạt';
  if (turn?.state === 'stopped') return 'Yêu cầu đã dừng trước khi có kết quả cuối';
  if (turn?.state === 'waiting') return 'Codex đang chờ bạn kiểm tra trên laptop';
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(turn?.updatedAt ?? event.occurredAt)) / 60_000),
  );
  return `Chưa có tín hiệu mới trong ${minutes} phút`;
}

export function threadSections(
  events: ActivityEventDto[],
  hero: ActivityEventDto | null,
  now: Date,
  stale: boolean,
) {
  const remaining = events.filter(
    (event) => threadIdentity(event) !== (hero && threadIdentity(hero)),
  );
  const active: ActivityEventDto[] = [];
  const attention: ActivityEventDto[] = [];
  const legacy: ActivityEventDto[] = [];
  const recent = new Map<string, ActivityEventDto[]>();
  for (const event of remaining) {
    if (!event.session?.thread) legacy.push(event);
    else if (needsAttention(event, now, stale)) attention.push(event);
    else if (sessionIsWorking(event, now, stale)) active.push(event);
    else {
      const day = dateGroup(threadTime(event), now);
      recent.set(day, [...(recent.get(day) ?? []), event]);
    }
  }
  return [
    { label: 'Đang làm việc', events: active },
    { label: 'Cần chú ý', events: attention },
    ...[...recent].map(([day, events]) => ({ label: `Gần đây · ${day}`, events })),
    { label: 'Hoạt động cũ', events: legacy },
  ].filter((group) => group.events.length);
}

export function resultPreview(event: ActivityEventDto): string {
  const excerpt = event.resultExcerpt?.trim();
  if (!excerpt) {
    const stage = event.session?.timeline.at(-1);
    return stage ? timelineLabel(stage) : '';
  }
  return workPreview(excerpt);
}

export function failureNote(event: ActivityEventDto, wholeThread = false): string {
  const count =
    (wholeThread
      ? (event.session?.thread?.failedTestCount ?? event.session?.failedTestCount)
      : event.session?.failedTestCount) ?? 0;
  if (!count) return '';
  const resolved =
    event.session?.state === 'completed' && event.session?.lastTestState !== 'failed';
  return `${count} lần kiểm thử chưa đạt${resolved ? ' trước khi hoàn tất' : ''}`;
}
