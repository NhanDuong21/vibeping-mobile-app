import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'onboarding',
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/ui/onboarding-page').then(
        (module) => module.OnboardingPage,
      ),
  },
  {
    path: 'activity',
    loadComponent: () =>
      import('./features/system/ui/system-page').then(
        (module) => module.SystemPage,
      ),
  },
  {
    path: 'settings/notifications',
    loadComponent: () =>
      import('./features/onboarding/ui/onboarding-page').then(
        (module) => module.OnboardingPage,
      ),
  },
  { path: '**', redirectTo: 'onboarding' },
];
