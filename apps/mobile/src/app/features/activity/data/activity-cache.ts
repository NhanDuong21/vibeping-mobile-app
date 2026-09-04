import { inject, Injectable } from '@angular/core';
import type { ActivityEventDto, BootstrapDto } from '../../../core/api/api-client';
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
  events: ActivityEventDto[];
  nextCursor: string | null;
  pendingReadIds: string[];
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
    Array.isArray(cached.pendingReadIds) &&
    cached.pendingReadIds.every((id) => typeof id === 'string') &&
    typeof cached.pendingReadAll === 'boolean' &&
    (cached.nextCursor === null || typeof cached.nextCursor === 'string') &&
    Boolean(cached.usageLimits && typeof cached.usageLimits === 'object')
  );
}

function isCachedEvent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<ActivityEventDto>;
  return (
    typeof event.id === 'string' &&
    typeof event.eventType === 'string' &&
    typeof event.title === 'string' &&
    typeof event.summary === 'string' &&
    typeof event.projectName === 'string' &&
    typeof event.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(event.occurredAt)) &&
    typeof event.isRead === 'boolean'
  );
}
