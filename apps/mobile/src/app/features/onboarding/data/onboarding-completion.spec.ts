import {
  onboardingCompleted,
  rememberOnboardingCompleted,
  rememberOnboardingStarted,
} from './onboarding-completion';

describe('onboarding completion', () => {
  beforeEach(() => localStorage.clear());

  it('keeps an unfinished first setup in onboarding', () => {
    rememberOnboardingStarted();
    localStorage.setItem('vibeping.subscription-id', 'subscription-new');

    expect(onboardingCompleted()).toBe(false);
  });

  it('remembers an explicitly completed setup', () => {
    rememberOnboardingCompleted();

    expect(onboardingCompleted()).toBe(true);
  });

  it('migrates an existing subscription from the previous app version', () => {
    localStorage.setItem('vibeping.subscription-id', 'subscription-existing');

    expect(onboardingCompleted()).toBe(true);
    expect(localStorage.getItem('vibeping.onboarding-state')).toBe('completed');
  });
});
