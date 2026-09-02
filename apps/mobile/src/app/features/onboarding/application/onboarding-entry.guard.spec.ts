import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { rememberOnboardingCompleted } from '../data/onboarding-completion';
import { onboardingEntryGuard } from './onboarding-entry.guard';

describe('onboardingEntryGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('allows the first setup to open', () => {
    const result = TestBed.runInInjectionContext(() => onboardingEntryGuard({}, [], {} as never));

    expect(result).toBe(true);
  });

  it('redirects a completed setup to Activity', () => {
    rememberOnboardingCompleted();
    const result = TestBed.runInInjectionContext(() => onboardingEntryGuard({}, [], {} as never));
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as UrlTree)).toBe('/activity');
  });
});
