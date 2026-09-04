import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ActivityStore } from './activity.store';

/** The app owns the live session; cached Ionic pages never close it on navigation. */
@Injectable({ providedIn: 'root' })
export class ActivitySession {
  readonly #activity = inject(ActivityStore);
  readonly #router = inject(Router);

  constructor() {
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.#followRoute(event.urlAfterRedirects));
    this.#followRoute(this.#router.url);
    inject(DestroyRef).onDestroy(() => this.#activity.stop());
  }

  #followRoute(url: string): void {
    const path = url.split(/[?#]/)[0];
    if (/^\/(activity|computer|settings|usage-limits|diagnostics)(\/|$)/.test(path))
      this.#activity.start();
    else this.#activity.stop();
  }
}
