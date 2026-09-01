import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom, take } from 'rxjs';
import {
  ApiClient,
  type PairingStatusDto,
  type SubscriptionRegistrationDto,
} from '../../../core/api/api-client';
import {
  clientErrorCopy,
  type ClientErrorCopy,
} from '../../../core/error-mapping/client-error';

export type OnboardingStage =
  | 'loading'
  | 'welcome'
  | 'pairing'
  | 'install'
  | 'permission'
  | 'denied'
  | 'test'
  | 'testPending'
  | 'testAccepted'
  | 'ready'
  | 'tailscaleUnavailable'
  | 'unsupported'
  | 'notOwner'
  | 'laptopUnavailable';

@Injectable({ providedIn: 'root' })
export class OnboardingStore {
  readonly #api = inject(ApiClient);
  readonly #push = inject(SwPush);
  readonly #stage = signal<OnboardingStage>('loading');
  readonly #busy = signal(false);
  readonly #error = signal<ClientErrorCopy | null>(null);
  readonly #installationId = loadInstallationId();
  #status?: PairingStatusDto;
  #publicKey = '';

  readonly stage = this.#stage.asReadonly();
  readonly busy = this.#busy.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly canSubmit = computed(() => !this.#busy());

  async start(): Promise<void> {
    this.#busy.set(true);
    this.#error.set(null);
    try {
      const [status, sender] = await Promise.all([
        firstValueFrom(this.#api.pairingStatus()),
        firstValueFrom(this.#api.pushPublicKey()),
      ]);
      this.#status = status;
      this.#publicKey = sender.publicKey;
      this.#stage.set('welcome');
    } catch {
      this.#stage.set('laptopUnavailable');
    } finally {
      this.#busy.set(false);
    }
  }

  continue(): void {
    if (!this.#status?.privateIdentityReady) {
      this.#stage.set('tailscaleUnavailable');
    } else if (this.#status.state === 'pairingRequired') {
      this.#stage.set('pairing');
    } else if (this.#status.state === 'notOwner') {
      this.#stage.set('notOwner');
    } else {
      void this.#advanceAfterPairing();
    }
  }

  async pair(code: string): Promise<void> {
    const csrf = this.#status?.csrfToken;
    if (!csrf || this.#busy()) return;
    this.#busy.set(true);
    this.#error.set(null);
    try {
      await firstValueFrom(
        this.#api.claimPairing(
          {
            code,
            installationId: this.#installationId,
            displayMode: displayMode(),
            notificationPermission: permission(),
          },
          csrf,
        ),
      );
      this.#status = { ...this.#status!, state: 'paired', ownerMatch: true };
      await this.#advanceAfterPairing();
    } catch (error) {
      this.#error.set(clientErrorCopy(errorCode(error)));
    } finally {
      this.#busy.set(false);
    }
  }

  async checkInstalled(): Promise<void> {
    await this.#advanceAfterPairing();
  }

  async enableNotifications(): Promise<void> {
    if (!this.#status || this.#busy()) return;
    this.#busy.set(true);
    this.#error.set(null);
    try {
      const subscription = await this.#push.requestSubscription({
        serverPublicKey: this.#publicKey,
      });
      await this.#saveSubscription(subscription);
      this.#stage.set('test');
    } catch (error) {
      if (permission() === 'denied') {
        this.#stage.set('denied');
      } else {
        this.#error.set(clientErrorCopy(errorCode(error)));
      }
    } finally {
      this.#busy.set(false);
    }
  }

  async sendTest(): Promise<void> {
    if (!this.#status || this.#busy()) return;
    this.#stage.set('testPending');
    this.#busy.set(true);
    this.#error.set(null);
    try {
      const response = await firstValueFrom(
        this.#api.testPush(this.#installationId, this.#status.csrfToken),
      );
      this.#stage.set(
        response.state === 'providerAccepted' ? 'testAccepted' : 'test',
      );
      if (response.state !== 'providerAccepted') {
        this.#error.set({
          title: 'Tín hiệu vẫn đang chờ gửi.',
          action: 'VibePing sẽ tiếp tục thử trong nền.',
        });
      }
    } catch (error) {
      this.#stage.set('test');
      this.#error.set(clientErrorCopy(errorCode(error)));
    } finally {
      this.#busy.set(false);
    }
  }

  finishTest(): void {
    this.#stage.set('ready');
  }

  async #advanceAfterPairing(): Promise<void> {
    this.#error.set(null);
    if (!isStandalone()) {
      this.#stage.set('install');
      return;
    }
    if (!this.#push.isEnabled || typeof Notification === 'undefined') {
      this.#stage.set('unsupported');
      return;
    }
    if (permission() === 'denied') {
      this.#stage.set('denied');
      return;
    }
    const current = await firstValueFrom(this.#push.subscription.pipe(take(1)));
    if (current) {
      await this.#saveSubscription(current);
      this.#stage.set('test');
    } else {
      this.#stage.set('permission');
    }
  }

  async #saveSubscription(subscription: PushSubscription): Promise<void> {
    const json = subscription.toJSON();
    const keys = json.keys;
    if (!json.endpoint || !keys?.['p256dh'] || !keys['auth'] || !this.#status) {
      throw new Error('SUBSCRIPTION_INVALID');
    }
    const request: SubscriptionRegistrationDto = {
      installationId: this.#installationId,
      displayMode: displayMode(),
      notificationPermission: permission(),
      subscription: {
        endpoint: json.endpoint,
        expirationTime: json.expirationTime,
        keys: { p256dh: keys['p256dh'], auth: keys['auth'] },
      },
    };
    await firstValueFrom(
      this.#api.saveSubscription(request, this.#status.csrfToken),
    );
  }
}

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function displayMode(): 'browser' | 'standalone' {
  return isStandalone() ? 'standalone' : 'browser';
}

function permission(): NotificationPermission {
  return typeof Notification === 'undefined' ? 'default' : Notification.permission;
}

function loadInstallationId(): string {
  const key = 'vibeping.installation-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function errorCode(error: unknown): string | undefined {
  if (error instanceof HttpErrorResponse) {
    return (error.error as { code?: string } | null)?.code;
  }
  return error instanceof Error ? error.message : undefined;
}
