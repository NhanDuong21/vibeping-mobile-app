import { Injectable } from '@angular/core';
import type {
  ActivityEventDto,
  BootstrapDto,
} from '../../../core/api/api-client';

export const ACTIVITY_CACHE_VERSION = 2;
const DATABASE_NAME = 'vibeping-mobile';
const STORE_NAME = 'activity-feed';
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
  async read(): Promise<CachedActivity | null> {
    try {
      const database = await openDatabase();
      const value = await request<unknown>(
        database.transaction(STORE_NAME).objectStore(STORE_NAME).get(SNAPSHOT_KEY),
      );
      if (!isCachedActivity(value)) {
        await request(
          database
            .transaction(STORE_NAME, 'readwrite')
            .objectStore(STORE_NAME)
            .delete(SNAPSHOT_KEY),
        );
        database.close();
        return null;
      }
      database.close();
      return value;
    } catch {
      return null;
    }
  }

  async write(snapshot: CachedActivity): Promise<void> {
    try {
      const database = await openDatabase();
      await request(
        database
          .transaction(STORE_NAME, 'readwrite')
          .objectStore(STORE_NAME)
          .put(snapshot, SNAPSHOT_KEY),
      );
      database.close();
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

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('CACHE_UNAVAILABLE'));
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE_NAME, ACTIVITY_CACHE_VERSION);
    opening.onupgradeneeded = () => {
      const database = opening.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => reject(new Error('CACHE_BLOCKED'));
  });
}

function request<T = IDBValidKey>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}
