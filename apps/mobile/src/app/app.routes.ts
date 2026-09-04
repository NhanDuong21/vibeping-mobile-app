import { Routes } from '@angular/router';
import { onboardingEntryGuard } from './features/onboarding/application/onboarding-entry.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'onboarding',
  },
  {
    path: 'onboarding',
    canMatch: [onboardingEntryGuard],
    loadComponent: () =>
      import('./features/onboarding/ui/onboarding-page').then((module) => module.OnboardingPage),
  },
  {
    path: 'activity',
    loadComponent: () =>
      import('./features/activity/ui/activity-page').then((module) => module.ActivityPage),
  },
  {
    path: 'activity/sessions/:id',
    loadComponent: () =>
      import('./features/activity/ui/thread-detail-page').then((module) => module.ThreadDetailPage),
  },
  {
    path: 'activity/events/:id',
    loadComponent: () =>
      import('./features/activity/ui/event-detail-page').then((module) => module.EventDetailPage),
  },
  {
    path: 'usage-limits',
    loadComponent: () =>
      import('./features/usage-limits/ui/usage-limits-page').then(
        (module) => module.UsageLimitsPage,
      ),
  },
  {
    path: 'computer',
    loadComponent: () =>
      import('./features/computer/ui/computer-page').then((module) => module.ComputerPage),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/ui/settings-page').then((module) => module.SettingsPage),
  },
  {
    path: 'settings/projects',
    loadComponent: () => import('./features/personal/ui/projects-page').then((m) => m.ProjectsPage),
  },
  {
    path: 'settings/projects/:project',
    loadComponent: () => import('./features/personal/ui/project-page').then((m) => m.ProjectPage),
  },
  {
    path: 'settings/notifications',
    redirectTo: 'settings',
    pathMatch: 'full',
  },
  {
    path: 'diagnostics',
    loadComponent: () =>
      import('./features/diagnostics/ui/diagnostics-page').then((module) => module.DiagnosticsPage),
  },
  { path: '**', redirectTo: 'onboarding' },
];
