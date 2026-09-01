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
      import('./features/activity/ui/activity-page').then(
        (module) => module.ActivityPage,
      ),
  },
  {
    path: 'activity/events/:id',
    loadComponent: () =>
      import('./features/activity/ui/event-detail-page').then(
        (module) => module.EventDetailPage,
      ),
  },
  {
    path: 'usage-limits',
    loadComponent: () =>
      import('./features/usage-limits/ui/usage-limits-page').then(
        (module) => module.UsageLimitsPage,
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
