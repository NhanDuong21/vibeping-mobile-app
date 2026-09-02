import { subscriptionId } from '../../../core/notifications/registration';

const STORAGE_KEY = 'vibeping.onboarding-state';
const STARTED = 'started';
const COMPLETED = 'completed';

export function onboardingCompleted(): boolean {
  const state = localStorage.getItem(STORAGE_KEY);
  if (state === COMPLETED) return true;
  if (state !== null || subscriptionId() === null) return false;

  rememberOnboardingCompleted();
  return true;
}

export function rememberOnboardingStarted(): void {
  if (localStorage.getItem(STORAGE_KEY) === null) {
    localStorage.setItem(STORAGE_KEY, STARTED);
  }
}

export function rememberOnboardingCompleted(): void {
  localStorage.setItem(STORAGE_KEY, COMPLETED);
}
