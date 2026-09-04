import { inject, Injectable } from '@angular/core';
import type { UsageLimitsSnapshotDto } from '../../../core/api/api-client';
import { MobileSnapshotStorage } from '../../../core/cache/mobile-snapshot-storage';

const SNAPSHOT_KEY = 'last-usage-limits';

@Injectable({ providedIn: 'root' })
export class UsageLimitsCache {
  readonly #storage = inject(MobileSnapshotStorage);

  async read(): Promise<UsageLimitsSnapshotDto | null> {
    try {
      const value = await this.#storage.read(SNAPSHOT_KEY);
      if (isUsableUsageSnapshot(value)) return value;
      // RC2 and older kept limits only inside the activity snapshot. Migrate a
      // valid copy without changing that record or its pending read actions.
      const legacy = (await this.#storage.read('snapshot')) as { usageLimits?: unknown } | null;
      if (!isUsableUsageSnapshot(legacy?.usageLimits)) return null;
      await this.write(legacy.usageLimits);
      return legacy.usageLimits;
    } catch {
      return null;
    }
  }

  async write(snapshot: UsageLimitsSnapshotDto): Promise<void> {
    if (!isUsableUsageSnapshot(snapshot)) return;
    try {
      await this.#storage.update(SNAPSHOT_KEY, (previous) =>
        isUsableUsageSnapshot(previous) && readTime(previous) > readTime(snapshot)
          ? previous
          : snapshot,
      );
    } catch {
      // Browser storage is optional; never discard the in-memory last good reading.
    }
  }
}

export function readTime(snapshot: UsageLimitsSnapshotDto): number {
  return snapshot.readAt ? Date.parse(snapshot.readAt) : 0;
}

export function isUsableUsageSnapshot(value: unknown): value is UsageLimitsSnapshotDto {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<UsageLimitsSnapshotDto>;
  return (
    (snapshot.state === 'available' || snapshot.state === 'stale') &&
    typeof snapshot.cursor === 'string' &&
    (snapshot.readAt === null ||
      (typeof snapshot.readAt === 'string' && Number.isFinite(Date.parse(snapshot.readAt)))) &&
    Array.isArray(snapshot.windows) &&
    snapshot.windows.length > 0 &&
    snapshot.windows.length <= 100 &&
    snapshot.windows.every(
      (window) =>
        window &&
        typeof window.windowKey === 'string' &&
        typeof window.label === 'string' &&
        typeof window.windowKind === 'string' &&
        typeof window.reached === 'boolean' &&
        Number.isFinite(window.remainingPercent) &&
        window.remainingPercent >= 0 &&
        window.remainingPercent <= 100 &&
        Number.isFinite(window.durationMinutes) &&
        window.durationMinutes > 0 &&
        Number.isFinite(window.resetsAt) &&
        Number.isFinite(new Date(window.resetsAt * 1000).getTime()),
    )
  );
}
