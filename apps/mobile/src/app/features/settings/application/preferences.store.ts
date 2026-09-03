import { computed, inject, Injectable, signal } from '@angular/core';
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
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
type NotificationHealth = 'loading' | 'healthy' | 'stale' | 'denied' | 'unsupported';
type NotificationRecovery = 'idle' | 'working' | 'ready' | 'denied' | 'unsupported' | 'failed';
type NotificationKey = keyof PreferencesDto['notifications'];
type PrivacyMode = 'standard' | 'project' | 'private';

@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  readonly #api = inject(ApiClient);
  readonly #push = inject(SwPush);
  readonly #theme = inject(ThemeStore);
  readonly #state = signal<SettingState>('loading');
  readonly #draft = signal<PreferencesDto | null>(null);
  readonly #saveState = signal<SaveState>('idle');
  readonly #notificationHealth = signal<NotificationHealth>('loading');
  readonly #recovery = signal<NotificationRecovery>('idle');
  #saveRequested = false;
  #saveLoop?: Promise<void>;

  readonly state = this.#state.asReadonly();
  readonly draft = this.#draft.asReadonly();
  readonly saveState = this.#saveState.asReadonly();
  readonly saving = computed(() => this.#saveState() === 'saving');
  readonly saved = computed(() => this.#saveState() === 'saved');
  readonly saveFailed = computed(() => this.#saveState() === 'failed');
  readonly notificationHealth = this.#notificationHealth.asReadonly();
  readonly recovery = this.#recovery.asReadonly();

  async load(): Promise<void> {
    this.#state.set('loading');
    try {
      const value = await firstValueFrom(this.#api.preferences());
      this.#draft.set(value);
      this.#theme.set(value.theme);
      this.#saveState.set('idle');
      this.#state.set('ready');
      await this.#loadNotificationHealth();
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

  setPrivacyMode(mode: PrivacyMode): void {
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
    if (!this.#draft()) return;
    this.#saveRequested = true;
    this.#saveState.set('saving');
    this.#saveLoop ??= this.#drainSaves();
    await this.#saveLoop;
  }

  async resetNotifications(): Promise<void> {
    if (notificationPermission() === 'denied') {
      this.#notificationHealth.set('denied');
      this.#recovery.set('denied');
      return;
    }
    if (!this.#push.isEnabled) {
      this.#notificationHealth.set('unsupported');
      this.#recovery.set('unsupported');
      return;
    }
    this.#recovery.set('working');
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      const existingId = subscriptionId();
      if (existingId) {
        await firstValueFrom(this.#api.removeSubscription(existingId, pairing.csrfToken)).catch(
          () => undefined,
        );
      }
      const existing = await firstValueFrom(this.#push.subscription);
      if (existing) await existing.unsubscribe();
      forgetSubscription();
      const sender = await firstValueFrom(this.#api.pushPublicKey());
      const subscription = await this.#push.requestSubscription({
        serverPublicKey: sender.publicKey,
      });
      const saved = await firstValueFrom(
        this.#api.saveSubscription(registrationFor(subscription), pairing.csrfToken),
      );
      rememberSubscription(saved.id);
      this.#notificationHealth.set('healthy');
      this.#recovery.set('ready');
    } catch {
      this.#recovery.set('failed');
    }
  }

  #update(change: (value: PreferencesDto) => PreferencesDto): void {
    const current = this.#draft();
    if (!current) return;
    this.#draft.set(change(current));
    void this.save();
  }

  async #drainSaves(): Promise<void> {
    try {
      while (this.#saveRequested) {
        this.#saveRequested = false;
        const requested = this.#draft();
        if (!requested) return;
        try {
          const pairing = await firstValueFrom(this.#api.pairingStatus());
          const saved = await firstValueFrom(
            this.#api.savePreferences(requested, pairing.csrfToken),
          );
          if (this.#draft() === requested) this.#draft.set(saved);
          if (!this.#saveRequested) this.#saveState.set('saved');
        } catch {
          this.#saveRequested = false;
          this.#saveState.set('failed');
        }
      }
    } finally {
      this.#saveLoop = undefined;
    }
  }

  async #loadNotificationHealth(): Promise<void> {
    if (notificationPermission() === 'denied') {
      this.#notificationHealth.set('denied');
      return;
    }
    try {
      const status = await firstValueFrom(this.#api.computerStatus());
      this.#notificationHealth.set(status.notifications === 'ready' ? 'healthy' : 'stale');
    } catch {
      if (!this.#push.isEnabled) this.#notificationHealth.set('unsupported');
      else this.#notificationHealth.set(subscriptionId() ? 'healthy' : 'stale');
    }
  }
}
