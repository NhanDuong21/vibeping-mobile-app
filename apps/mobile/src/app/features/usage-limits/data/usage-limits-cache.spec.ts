import { TestBed } from '@angular/core/testing';
import { MobileSnapshotStorage } from '../../../core/cache/mobile-snapshot-storage';
import { UsageLimitsCache, isUsableUsageSnapshot } from './usage-limits-cache';

const reading = {
  state: 'available',
  readAt: '2026-09-04T00:00:00Z',
  cursor: '1',
  windows: [
    {
      windowKey: 'key',
      label: 'Hạn mức tuần',
      windowKind: 'secondary',
      remainingPercent: 0,
      durationMinutes: 10080,
      resetsAt: 2_000_000_000,
      reached: true,
    },
  ],
};

describe('allowance cache', () => {
  it('validates zero as a real reading but rejects missing or malformed data', () => {
    expect(isUsableUsageSnapshot(reading)).toBe(true);
    for (const value of [
      null,
      {},
      { ...reading, windows: [] },
      { ...reading, readAt: 'invalid' },
      { ...reading, windows: [{ ...reading.windows[0], remainingPercent: null }] },
      { ...reading, windows: [{ ...reading.windows[0], remainingPercent: 101 }] },
    ]) {
      expect(isUsableUsageSnapshot(value)).toBe(false);
    }
  });

  it('migrates the older activity snapshot without overwriting its pending actions', async () => {
    const stored = new Map<string, unknown>([
      ['snapshot', { usageLimits: reading, pendingReadIds: ['pending'] }],
    ]);
    const storage = {
      read: async (key: string) => stored.get(key),
      update: async (key: string, reduce: (value: unknown) => unknown) => {
        stored.set(key, reduce(stored.get(key)));
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: MobileSnapshotStorage, useValue: storage }],
    });
    const cache = TestBed.inject(UsageLimitsCache);
    expect(await cache.read()).toEqual(reading);
    expect(stored.get('last-usage-limits')).toEqual(reading);
    expect(stored.get('snapshot')).toEqual({ usageLimits: reading, pendingReadIds: ['pending'] });
    await cache.write({ ...reading, readAt: '2026-09-03T00:00:00Z' });
    expect(stored.get('last-usage-limits')).toEqual(reading);
  });

  it('tolerates storage read and write failures', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MobileSnapshotStorage,
          useValue: {
            read: vi.fn().mockRejectedValue(new Error('blocked')),
            update: vi.fn().mockRejectedValue(new Error('quota')),
          },
        },
      ],
    });
    const cache = TestBed.inject(UsageLimitsCache);
    expect(await cache.read()).toBeNull();
    await expect(cache.write(reading)).resolves.toBeUndefined();
  });
});
