import type { ActivityEventDto, CurrentWorkDto } from '../../../core/api/api-client';

export function mergeEvents(
  current: ActivityEventDto[],
  incoming: ActivityEventDto[],
): ActivityEventDto[] {
  const merged = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) {
    const previous = merged.get(event.id);
    const updated = { ...previous, ...event };
    const sameRevision = !event.session || previous?.session?.updatedAt === event.session.updatedAt;
    merged.set(event.id, previous?.isRead && sameRevision ? { ...updated, isRead: true } : updated);
  }
  return [...merged.values()].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime() ||
      right.id.localeCompare(left.id),
  );
}

export function localUnread(events: ActivityEventDto[]): number {
  return events.filter((event) => !event.isRead).length;
}

export function isCurrentWork(value: unknown): value is CurrentWorkDto {
  if (!value || typeof value !== 'object') return false;
  const current = value as Partial<CurrentWorkDto>;
  return (
    typeof current.projectName === 'string' &&
    ['running', 'waiting', 'unconfirmed'].includes(current.state ?? '') &&
    typeof current.lastTestState === 'string' &&
    typeof current.previewReady === 'boolean' &&
    typeof current.startedAt === 'string' &&
    typeof current.updatedAt === 'string' &&
    typeof current.freshUntil === 'string' &&
    Number.isFinite(Date.parse(current.freshUntil))
  );
}
