import type { ActivityEventDetailDto, ActivityEventDto } from '../../../core/api/api-client';
import { mergeEvents } from './activity-reconciliation';

export type CachedEvent = ActivityEventDto &
  Partial<Pick<ActivityEventDetailDto, 'result' | 'timeline'>>;

/** Keep viewed RC8 answers until their page arrives, then attach them using server-owned aliases. */
export function mergeSessionFeed(
  current: CachedEvent[],
  incoming: ActivityEventDto[],
  legacy: CachedEvent[],
): { events: CachedEvent[]; legacy: CachedEvent[] } {
  if (!incoming.some((event) => event.session))
    return { events: mergeEvents(current, incoming), legacy };
  const saved = new Map(legacy.map((event) => [event.id, event]));
  for (const event of current) if (!event.session && event.result) saved.set(event.id, event);
  const enriched = incoming.map((event) => {
    if (!event.session) return event;
    const aliases = event.session.eventIds ?? [];
    const viewed = [...saved.values()].filter((value) => aliases.includes(value.id));
    for (const value of viewed) saved.delete(value.id);
    const answer = viewed.find((value) => value.result);
    return answer ? { ...answer, ...event } : event;
  });
  const aliases = new Set(incoming.flatMap((event) => event.session?.eventIds ?? []));
  const grouped = attachThreadIdentity(
    current.filter((event) => event.session || !aliases.has(event.id)),
    incoming,
  );
  return { events: mergeEvents(grouped, enriched), legacy: [...saved.values()].slice(0, 100) };
}

/** Upgrade per-turn caches using verified server membership, never a project-name guess. */
function attachThreadIdentity(current: CachedEvent[], incoming: ActivityEventDto[]): CachedEvent[] {
  const membership = new Map<
    string,
    NonNullable<NonNullable<ActivityEventDto['session']>['thread']>
  >();
  for (const event of incoming) {
    const thread = event.session?.thread;
    if (!thread?.turnIds) continue;
    thread.turnIds.forEach((id, index, ids) => {
      membership.set(id, {
        ...thread,
        turnNumber: index + 1,
        previousTurnId: ids[index - 1] ?? null,
        nextTurnId: ids[index + 1] ?? null,
      });
    });
  }
  return current.map((event) => {
    const thread = membership.get(event.id);
    return event.session && thread ? { ...event, session: { ...event.session, thread } } : event;
  });
}
