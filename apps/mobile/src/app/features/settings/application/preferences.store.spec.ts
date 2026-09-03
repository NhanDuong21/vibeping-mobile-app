import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { of, throwError } from 'rxjs';
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

function setup(savePreferences = vi.fn().mockImplementation((value: PreferencesDto) => of(value))) {
  const api = {
    preferences: vi.fn().mockReturnValue(of(preferences)),
    pairingStatus: vi.fn().mockReturnValue(of({ csrfToken: 'csrf' })),
    savePreferences,
    computerStatus: vi.fn().mockReturnValue(of({ notifications: 'ready' })),
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
  return { store: TestBed.inject(PreferencesStore), api, theme };
}

describe('PreferencesStore', () => {
  it('persists discrete retention, threshold, and privacy choices immediately', async () => {
    const { store, api } = setup();
    await store.load();

    store.setRetentionDays(90);
    await vi.waitFor(() => expect(api.savePreferences).toHaveBeenCalledTimes(1));
    expect(api.savePreferences.mock.calls.at(-1)?.[0]).toMatchObject({ retentionDays: 90 });

    store.setAllowanceThreshold(30);
    await vi.waitFor(() => expect(api.savePreferences).toHaveBeenCalledTimes(2));
    expect(api.savePreferences.mock.calls.at(-1)?.[0]).toMatchObject({
      allowanceThresholdPercent: 30,
    });

    store.setPrivacyMode('project');
    await vi.waitFor(() => expect(api.savePreferences).toHaveBeenCalledTimes(3));
    expect(api.savePreferences.mock.calls.at(-1)?.[0]).toMatchObject({ privacyMode: 'project' });
    expect(store.saved()).toBe(true);
  });

  it('coalesces edits and keeps the complete overnight quiet-hours object', async () => {
    const { store, api, theme } = setup();
    await store.load();
    store.toggleQuietHours();
    store.setQuietTime('start', '23:00');
    store.setQuietTime('end', '06:30');
    store.setTheme('dark');

    await vi.waitFor(() => expect(store.saved()).toBe(true));
    expect(api.savePreferences.mock.calls.at(-1)?.[0]).toMatchObject({
      quietHours: { enabled: true, start: '23:00', end: '06:30' },
      theme: 'dark',
    });
    expect(theme.set).toHaveBeenCalledWith('dark');
  });

  it('shows a recoverable failure and saves the pending choice on retry', async () => {
    const savePreferences = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockImplementation((value: PreferencesDto) => of(value));
    const { store } = setup(savePreferences);
    await store.load();

    store.setRetentionDays(60);
    await vi.waitFor(() => expect(store.saveFailed()).toBe(true));
    expect(store.draft()?.retentionDays).toBe(60);

    await store.save();
    expect(store.saved()).toBe(true);
    expect(savePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({ retentionDays: 60 }),
      'csrf',
    );
  });

  it('recognizes healthy notifications without offering recovery', async () => {
    const { store } = setup();
    await store.load();
    expect(store.notificationHealth()).toBe('healthy');
  });
});
