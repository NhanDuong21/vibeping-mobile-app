import type { SubscriptionRegistrationDto } from '../api/api-client';

const INSTALLATION_KEY = 'vibeping.installation-id';
const SUBSCRIPTION_KEY = 'vibeping.subscription-id';

export function installationId(): string {
  const existing = localStorage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(INSTALLATION_KEY, created);
  return created;
}

export function subscriptionId(): string | null {
  return localStorage.getItem(SUBSCRIPTION_KEY);
}

export function rememberSubscription(id: string): void {
  localStorage.setItem(SUBSCRIPTION_KEY, id);
}

export function forgetSubscription(): void {
  localStorage.removeItem(SUBSCRIPTION_KEY);
}

export function notificationPermission(): NotificationPermission {
  return typeof Notification === 'undefined' ? 'default' : Notification.permission;
}

export function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function registrationFor(subscription: PushSubscription): SubscriptionRegistrationDto {
  const json = subscription.toJSON();
  const keys = json.keys;
  if (!json.endpoint || !keys?.['p256dh'] || !keys['auth']) {
    throw new Error('SUBSCRIPTION_INVALID');
  }
  return {
    installationId: installationId(),
    displayMode: isStandalone() ? 'standalone' : 'browser',
    notificationPermission: notificationPermission(),
    subscription: {
      endpoint: json.endpoint,
      expirationTime: json.expirationTime,
      keys: { p256dh: keys['p256dh'], auth: keys['auth'] },
    },
  };
}
