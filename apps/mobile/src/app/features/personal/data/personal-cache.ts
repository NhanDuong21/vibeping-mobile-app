import { inject, Injectable } from '@angular/core';
import { MobileSnapshotStorage } from '../../../core/cache/mobile-snapshot-storage';
import type { DailySummary, PersonalRules, ProjectProfile } from './personal-api';

export function validRules(value: unknown): value is PersonalRules {
  const v = value as PersonalRules | null;
  return (
    !!v &&
    [0, 2, 5].includes(v.completionMinMinutes) &&
    [0, 5, 10].includes(v.waitingReminderMinutes)
  );
}
export function validProfile(value: unknown): value is ProjectProfile {
  const v = value as ProjectProfile | null;
  return (
    !!v &&
    typeof v.projectName === 'string' &&
    typeof v.displayName === 'string' &&
    v.displayName.length <= 120 &&
    !!v.displayName.trim() &&
    ['cat', 'heart', 'book', 'code', 'spark'].includes(v.icon) &&
    ['mint', 'blue', 'green', 'amber', 'coral'].includes(v.accent) &&
    [v.notifyCompletion, v.notifyPermission, v.notifyPreview, v.notifyFinalFailure].every(
      (x) => typeof x === 'boolean',
    ) &&
    (v.completionMinMinutes == null || [0, 2, 5].includes(v.completionMinMinutes)) &&
    (v.waitingReminderMinutes == null || [0, 5, 10].includes(v.waitingReminderMinutes))
  );
}
export function validSummary(value: unknown): value is DailySummary {
  const v = value as DailySummary | null;
  return (
    !!v &&
    [v.sessions, v.completed, v.failedTests, v.observedSeconds].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  );
}

@Injectable({ providedIn: 'root' })
export class PersonalCache {
  readonly #storage = inject(MobileSnapshotStorage);
  async read(key: string): Promise<unknown> {
    try {
      return await this.#storage.read('personal:' + key);
    } catch {
      return null;
    }
  }
  async write(key: string, value: unknown): Promise<void> {
    try {
      await this.#storage.write('personal:' + key, value);
    } catch {
      /* SQLite remains authoritative. */
    }
  }
}
