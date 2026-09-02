import { inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { ApiClient, type PreferencesDto } from '../../../core/api/api-client';
import {
  forgetSubscription,
  notificationPermission,
  registrationFor,
  rememberSubscription,
  subscriptionId,
} from '../../../core/notifications/registration';
import { ThemeStore } from '../../../core/theme/theme.store';

type SettingState = 'loading' | 'ready' | 'unavailable';
type NotificationRecovery = 'idle' | 'working' | 'ready' | 'denied' | 'unsupported' | 'failed';
type NotificationKey = keyof PreferencesDto['notifications'];

@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  readonly #api = inject(ApiClient);
  readonly #push = inject(SwPush);
  readonly #theme = inject(ThemeStore);
  readonly #state = signal<SettingState>('loading');
  readonly #draft = signal<PreferencesDto | null>(null);
  readonly #saving = signal(false);
  readonly #saved = signal(false);
  readonly #saveFailed = signal(false);
  readonly #recovery = signal<NotificationRecovery>('idle');

  readonly state = this.#state.asReadonly();
  readonly draft = this.#draft.asReadonly();
  readonly saving = this.#saving.asReadonly();
  readonly saved = this.#saved.asReadonly();
  readonly saveFailed = this.#saveFailed.asReadonly();
  readonly recovery = this.#recovery.asReadonly();

  async load(): Promise<void> {
    try {
      const value = await firstValueFrom(this.#api.preferences());
      this.#draft.set(value);
      this.#theme.set(value.theme);
      this.#state.set('ready');
    } catch {
      this.#state.set('unavailable');
    }
  }

  toggleNotification(key: NotificationKey): void {
    this.#update((value) => ({
      ...value,
      notifications: { ...value.notifications, [key]: !value.notifications[key] },
    }));
  }

  setAllowanceThreshold(value: number): void {
    this.#update((draft) => ({ ...draft, allowanceThresholdPercent: value }));
  }

  toggleCriticalAllowance(): void {
    this.#update((value) => ({
      ...value,
      criticalAllowanceNotifications: !value.criticalAllowanceNotifications,
    }));
  }

  toggleQuietHours(): void {
    this.#update((value) => ({
      ...value,
      quietHours: { ...value.quietHours, enabled: !value.quietHours.enabled },
    }));
  }

  setQuietTime(field: 'start' | 'end', time: string): void {
    this.#update((value) => ({
      ...value,
      quietHours: {
        ...value.quietHours,
        [field]: time,
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
      },
    }));
  }

  toggleUrgentException(): void {
    this.#update((value) => ({
      ...value,
      quietHours: { ...value.quietHours, allowUrgent: !value.quietHours.allowUrgent },
    }));
  }

  setPrivacyMode(mode: 'standard' | 'private'): void {
    this.#update((value) => ({ ...value, privacyMode: mode }));
  }

  setTheme(theme: 'system' | 'light' | 'dark'): void {
    this.#update((value) => ({ ...value, theme }));
    this.#theme.set(theme);
  }

  setRetentionDays(days: number): void {
    this.#update((value) => ({ ...value, retentionDays: days }));
  }

  async save(): Promise<void> {
    const draft = this.#draft();
    if (!draft || this.#saving()) return;
    this.#saving.set(true);
    this.#saved.set(false);
    this.#saveFailed.set(false);
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      const saved = await firstValueFrom(
        this.#api.savePreferences(draft, pairing.csrfToken),
      );
      this.#draft.set(saved);
      this.#saved.set(true);
    } catch {
      this.#saveFailed.set(true);
    } finally {
      this.#saving.set(false);
    }
  }

  async resetNotifications(): Promise<void> {
    if (notificationPermission() === 'denied') {
      this.#recovery.set('denied');
      return;
    }
    if (!this.#push.isEnabled) {
      this.#recovery.set('unsupported');
      return;
    }
    this.#recovery.set('working');
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      const existingId = subscriptionId();
      if (existingId) {
        await firstValueFrom(
          this.#api.removeSubscription(existingId, pairing.csrfToken),
        ).catch(() => undefined);
      }
      const existing = await firstValueFrom(this.#push.subscription);
      if (existing) await existing.unsubscribe();
      forgetSubscription();
      const sender = await firstValueFrom(this.#api.pushPublicKey());
      const subscription = await this.#push.requestSubscription({
        serverPublicKey: sender.publicKey,
      });
      const saved = await firstValueFrom(
        this.#api.saveSubscription(
          registrationFor(subscription),
          pairing.csrfToken,
        ),
      );
      rememberSubscription(saved.id);
      this.#recovery.set('ready');
    } catch {
      this.#recovery.set('failed');
    }
  }

  #update(change: (value: PreferencesDto) => PreferencesDto): void {
    const current = this.#draft();
    if (!current) return;
    this.#draft.set(change(current));
    this.#saved.set(false);
    this.#saveFailed.set(false);
  }
}
