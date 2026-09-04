import { Injectable } from '@angular/core';

export const MOBILE_CACHE_VERSION = 2;
// Keep the original database/store so installed phones retain their existing cache.
const DATABASE_NAME = 'vibeping-mobile';
const STORE_NAME = 'activity-feed';

@Injectable({ providedIn: 'root' })
export class MobileSnapshotStorage {
  async read(key: string): Promise<unknown> {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }

  write(key: string, value: unknown): Promise<void> {
    return this.update(key, () => value);
  }

  async update(key: string, reduce: (previous: unknown) => unknown): Promise<void> {
    const database = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          try {
            const value = reduce(request.result);
            if (value === undefined) store.delete(key);
            else store.put(value, key);
          } catch {
            transaction.abort();
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(new Error('CACHE_WRITE_FAILED'));
      });
    } finally {
      database.close();
    }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('CACHE_UNAVAILABLE'));
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE_NAME, MOBILE_CACHE_VERSION);
    let blocked = false;
    opening.onupgradeneeded = () => {
      if (!opening.result.objectStoreNames.contains(STORE_NAME)) {
        opening.result.createObjectStore(STORE_NAME);
      }
    };
    opening.onsuccess = () => {
      if (blocked) opening.result.close();
      else resolve(opening.result);
    };
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => {
      blocked = true;
      reject(new Error('CACHE_BLOCKED'));
    };
  });
}
