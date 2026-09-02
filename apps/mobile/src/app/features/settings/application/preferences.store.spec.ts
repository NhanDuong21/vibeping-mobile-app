import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { of } from 'rxjs';
import { ApiClient, type PreferencesDto } from '../../../core/api/api-client';
import { ThemeStore } from '../../../core/theme/theme.store';
import { PreferencesStore } from './preferences.store';

const preferences: PreferencesDto = {
  notifications: {
    completion: true,
    permission: true,
    preview: true,
    finalFailure: true,
    allowance: true,
  },
  allowanceThresholdPercent: 20,
  criticalAllowanceNotifications: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezoneOffsetMinutes: 420,
    allowUrgent: true,
  },
  privacyMode: 'standard',
  theme: 'system',
  retentionDays: 30,
};

describe('PreferencesStore', () => {
  it('edits an overnight quiet interval and persists one complete preference object', async () => {
    const api = {
      preferences: vi.fn().mockReturnValue(of(preferences)),
      pairingStatus: vi.fn().mockReturnValue(of({ csrfToken: 'csrf' })),
      savePreferences: vi.fn().mockImplementation((value: PreferencesDto) => of(value)),
    };
    const theme = { set: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        PreferencesStore,
        { provide: ApiClient, useValue: api },
        { provide: SwPush, useValue: { isEnabled: false } },
        { provide: ThemeStore, useValue: theme },
      ],
    });
    const store = TestBed.inject(PreferencesStore);
    await store.load();
    store.toggleQuietHours();
    store.setQuietTime('start', '23:00');
    store.setQuietTime('end', '06:30');
    store.setTheme('dark');
    await store.save();

    expect(api.savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        quietHours: expect.objectContaining({ enabled: true, start: '23:00', end: '06:30' }),
        theme: 'dark',
      }),
      'csrf',
    );
    expect(theme.set).toHaveBeenCalledWith('dark');
    expect(store.saved()).toBe(true);
  });
});
