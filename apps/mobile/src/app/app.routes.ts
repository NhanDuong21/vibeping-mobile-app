import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/system/ui/system-page').then(
        (module) => module.SystemPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
