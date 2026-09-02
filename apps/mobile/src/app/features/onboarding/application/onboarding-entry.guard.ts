import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { onboardingCompleted } from '../data/onboarding-completion';

export const onboardingEntryGuard: CanMatchFn = () =>
  onboardingCompleted() ? inject(Router).parseUrl('/activity') : true;
