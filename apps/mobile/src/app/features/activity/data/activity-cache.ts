import { inject, Injectable } from '@angular/core';
import type { ActivityEventDetailDto, BootstrapDto } from '../../../core/api/api-client';
import {
  MobileSnapshotStorage,
  MOBILE_CACHE_VERSION,
} from '../../../core/cache/mobile-snapshot-storage';

export const ACTIVITY_CACHE_VERSION = MOBILE_CACHE_VERSION;
const SNAPSHOT_KEY = 'snapshot';

export interface CachedActivity {
  savedAt: string;
  currentWork: BootstrapDto['currentWork'];
  usageLimits: BootstrapDto['usageLimits'];
  unreadCount: number;
  events: (Omit<ActivityEventDetailDto, 'timeline'> &
    Partial<Pick<ActivityEventDetailDto, 'timeline'>>)[];
  legacyResults?: CachedActivity['events'];
  nextCursor: string | null;
  pendingReadIds: string[];
  pendingReadThrough?: Record<string, string>;
  pendingReadAll: boolean;
}

@Injectable({ providedIn: 'root' })
export class ActivityCache {
  readonly #storage = inject(MobileSnapshotStorage);

  async read(): Promise<CachedActivity | null> {
    try {
      const value = await this.#storage.read(SNAPSHOT_KEY);
      if (!isCachedActivity(value)) {
        await this.#storage.write(SNAPSHOT_KEY, undefined);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  async write(snapshot: CachedActivity): Promise<void> {
    try {
      await this.#storage.write(SNAPSHOT_KEY, snapshot);
    } catch {
      // The server remains authoritative when browser storage is unavailable.
    }
  }
}

export function isCachedActivity(value: unknown): value is CachedActivity {
  if (!value || typeof value !== 'object') return false;
  const cached = value as Partial<CachedActivity>;
  return (
    typeof cached.savedAt === 'string' &&
    !Number.isNaN(Date.parse(cached.savedAt)) &&
    typeof cached.unreadCount === 'number' &&
    cached.unreadCount >= 0 &&
    Array.isArray(cached.events) &&
    cached.events.length <= 100 &&
    cached.events.every(isCachedEvent) &&
    (cached.legacyResults === undefined ||
      (Array.isArray(cached.legacyResults) &&
        cached.legacyResults.length <= 100 &&
        cached.legacyResults.every(isCachedEvent))) &&
    Array.isArray(cached.pendingReadIds) &&
    cached.pendingReadIds.every((id) => typeof id === 'string') &&
    (cached.pendingReadThrough === undefined ||
      (cached.pendingReadThrough !== null &&
        typeof cached.pendingReadThrough === 'object' &&
        Object.values(cached.pendingReadThrough).every(
          (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)),
        ))) &&
    typeof cached.pendingReadAll === 'boolean' &&
    (cached.nextCursor === null || typeof cached.nextCursor === 'string') &&
    Boolean(cached.usageLimits && typeof cached.usageLimits === 'object')
  );
}

export function isCachedEvent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<ActivityEventDetailDto>;
  return (
    typeof event.id === 'string' &&
    typeof event.eventType === 'string' &&
    typeof event.title === 'string' &&
    typeof event.summary === 'string' &&
    typeof event.projectName === 'string' &&
    typeof event.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(event.occurredAt)) &&
    typeof event.isRead === 'boolean' &&
    (event.session == null || isCachedSession(event.session)) &&
    (event.resultExcerpt == null || typeof event.resultExcerpt === 'string') &&
    (event.result == null ||
      (typeof event.result.text === 'string' &&
        [...event.result.text].length <= 8_000 &&
        typeof event.result.truncated === 'boolean')) &&
    (event.timeline === undefined ||
      (Array.isArray(event.timeline) &&
        event.timeline.every(
          (stage) =>
            stage &&
            typeof stage.eventType === 'string' &&
            typeof stage.occurredAt === 'string' &&
            Number.isFinite(Date.parse(stage.occurredAt)),
        )))
  );
}

function isCachedSession(value: NonNullable<ActivityEventDetailDto['session']>): boolean {
  const date = (input: unknown): boolean =>
    typeof input === 'string' && Number.isFinite(Date.parse(input));
  return (
    typeof value === 'object' &&
    (value.thread == null || isCachedThread(value.thread)) &&
    (value.taskLabel == null || typeof value.taskLabel === 'string') &&
    (value.lastTestState == null ||
      ['unknown', 'passed', 'failed'].includes(value.lastTestState)) &&
    Array.isArray(value.eventIds) &&
    value.eventIds.every((id) => typeof id === 'string') &&
    ['running', 'waiting', 'completed', 'stopped', 'failed', 'unconfirmed'].includes(value.state) &&
    date(value.updatedAt) &&
    (value.startedAt === null || date(value.startedAt)) &&
    (value.completedAt === null || date(value.completedAt)) &&
    Number.isInteger(value.failedTestCount) &&
    value.failedTestCount >= 0 &&
    Array.isArray(value.timeline) &&
    value.timeline.length <= 3 &&
    value.timeline.every(
      (stage) => stage && typeof stage.eventType === 'string' && date(stage.occurredAt),
    )
  );
}

function isCachedThread(
  value: NonNullable<NonNullable<ActivityEventDetailDto['session']>['thread']>,
): boolean {
  const date = (input: unknown): boolean =>
    typeof input === 'string' && Number.isFinite(Date.parse(input));
  return (
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    (value.title === null || typeof value.title === 'string') &&
    Number.isInteger(value.turnCount) &&
    value.turnCount > 0 &&
    Number.isInteger(value.turnNumber) &&
    value.turnNumber > 0 &&
    value.turnNumber <= value.turnCount &&
    (value.turnIds === undefined ||
      (Array.isArray(value.turnIds) && value.turnIds.every((id) => typeof id === 'string'))) &&
    typeof value.latestTurnId === 'string' &&
    (value.previousTurnId === null || typeof value.previousTurnId === 'string') &&
    (value.nextTurnId === null || typeof value.nextTurnId === 'string') &&
    date(value.firstSignalAt) &&
    date(value.updatedAt) &&
    (value.startedAt === null || date(value.startedAt)) &&
    Number.isInteger(value.failedTestCount) &&
    value.failedTestCount >= 0 &&
    typeof value.isRead === 'boolean'
  );
}
