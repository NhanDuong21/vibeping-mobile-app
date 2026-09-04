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
  const grouped = current.filter(
    (event) => event.session || event.eventType.startsWith('codex.allowance.'),
  );
  return { events: mergeEvents(grouped, enriched), legacy: [...saved.values()].slice(0, 100) };
}
