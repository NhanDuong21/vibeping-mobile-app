import { TestBed } from '@angular/core/testing';
import { PersonalApi } from '../data/personal-api';
import { PersonalCache } from '../data/personal-cache';
import { localDay, observedTime, TodaySummaryStore } from './today-summary.store';
import { ambientMotion, mascotState, reactionMotion } from './mascot-motion';
import { WindowsReadinessStore } from './windows-readiness.store';

describe('Personal summaries and states', () => {
  it('uses local day boundaries and formats observed duration without fake progress', () => {
    const day = localDay(new Date(2026, 8, 4, 23, 59));
    expect(new Date(day.from).getHours()).toBe(0);
    expect(new Date(day.to).getDate()).toBe(5);
    expect(observedTime(8280)).toBe('2 giờ 18 phút');
    expect(observedTime(29)).toBe('0 phút');
  });
  it('never displays yesterday as today when the laptop is offline', async () => {
    const api = { today: vi.fn().mockRejectedValue(new Error('offline')) };
    const cached = {
      from: new Date(2026, 8, 3).toISOString(),
      summary: { sessions: 6, completed: 5, failedTests: 1, observedSeconds: 8280 },
    };
    TestBed.configureTestingModule({
      providers: [
        TodaySummaryStore,
        { provide: PersonalApi, useValue: api },
        {
          provide: PersonalCache,
          useValue: { read: vi.fn().mockResolvedValue(cached), write: vi.fn() },
        },
      ],
    });
    const store = TestBed.inject(TodaySummaryStore);
    await store.load(new Date(2026, 8, 4, 12));
    expect(store.summary()).toBeNull();
    expect(store.state()).toBe('unavailable');
  });
  it('bounds repeated waiting motion and leaves failures and disconnections still', () => {
    expect(mascotState('unconfirmed')).toBe('offline');
    expect(ambientMotion('waiting')?.duration).toBe(8000);
    expect(ambientMotion('failed')).toBeNull();
    expect(ambientMotion('offline')).toBeNull();
    expect(reactionMotion('failed').at(-1)?.['transform']).toBe('translateX(0)');
  });
  it('does not claim Windows is ready from an old successful response after a failed refresh', async () => {
    const api = {
      ready: vi.fn().mockResolvedValue({
        enabled: true,
        autoStart: true,
        state: 'healthy',
        trayAvailable: true,
        recoveryCount: 0,
        checkedAt: new Date().toISOString(),
      }),
    };
    TestBed.configureTestingModule({
      providers: [WindowsReadinessStore, { provide: PersonalApi, useValue: api }],
    });
    const store = TestBed.inject(WindowsReadinessStore);
    await store.load();
    expect(store.label()).toBe('Laptop đang sẵn sàng');
    api.ready.mockRejectedValue(new Error('offline'));
    await store.load();
    expect(store.label()).toBe('Chưa kiểm tra được laptop');
  });
});
