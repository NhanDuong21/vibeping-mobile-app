import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { UsageLimitsStore } from './usage-limits.store';

describe('UsageLimitsStore', () => {
  it('renders dynamic windows and refreshes after an SSE update', () => {
    const listeners = new Map<string, EventListener>();
    const snapshot = {
      state: 'available',
      readAt: '2026-09-02T00:00:00Z',
      cursor: '1',
      windows: [
        {
          windowKey: 'private-key',
          label: 'Lượt dùng 5 giờ',
          windowKind: 'primary',
          remainingPercent: 19,
          durationMinutes: 300,
          resetsAt: 2_000_000_000,
          reached: false,
        },
      ],
    };
    const api = { usageLimits: vi.fn().mockReturnValue(of(snapshot)) };
    const stream = {
      addEventListener: vi.fn((name: string, listener: EventListener) =>
        listeners.set(name, listener),
      ),
      close: vi.fn(),
    } as unknown as EventSource;
    TestBed.configureTestingModule({
      providers: [
        UsageLimitsStore,
        { provide: ApiClient, useValue: api },
        { provide: EVENT_SOURCE_FACTORY, useValue: () => stream },
      ],
    });
    const store = TestBed.inject(UsageLimitsStore);
    store.start();
    expect(store.summary()[0].label).toBe('Lượt dùng 5 giờ');
    expect(store.statusLabel(store.summary()[0])).toBe('Sắp thấp');
    listeners.get('allowance')?.(new Event('allowance'));
    expect(api.usageLimits).toHaveBeenCalledTimes(2);
  });

  it('formats reset time without promising prompt counts', () => {
    TestBed.configureTestingModule({
      providers: [
        UsageLimitsStore,
        { provide: ApiClient, useValue: {} },
        { provide: EVENT_SOURCE_FACTORY, useValue: () => ({}) },
      ],
    });
    const store = TestBed.inject(UsageLimitsStore);
    const label = store.resetLabel(
      {
        windowKey: 'key',
        label: 'Chu kỳ 2 giờ',
        windowKind: 'primary',
        remainingPercent: 50,
        durationMinutes: 120,
        resetsAt: 1_800,
        reached: false,
      },
      new Date(0),
    );
    expect(label).toBe('Đặt lại sau 30 phút');
  });

  it('adds the weekday and next-week context to longer reset windows', () => {
    TestBed.configureTestingModule({
      providers: [
        UsageLimitsStore,
        { provide: ApiClient, useValue: {} },
        { provide: EVENT_SOURCE_FACTORY, useValue: () => ({}) },
      ],
    });
    const store = TestBed.inject(UsageLimitsStore);
    const now = new Date(2026, 8, 2, 10, 0);
    const nextMonday = new Date(2026, 8, 7, 9, 0);
    const label = store.resetLabel(
      {
        windowKey: 'weekly',
        label: 'Chu kỳ tuần',
        windowKind: 'secondary',
        remainingPercent: 70,
        durationMinutes: 10_080,
        resetsAt: Math.floor(nextMonday.getTime() / 1000),
        reached: false,
      },
      now,
    );
    expect(label).toBe('Đặt lại Thứ Hai tuần sau, 09:00 · 07/09');
  });
});
