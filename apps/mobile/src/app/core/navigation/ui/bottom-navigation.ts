import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { SignalMotion } from '../../motion/signal-motion';
import { ActivityStore } from '../../../features/activity/application/activity.store';

@Component({
  selector: 'app-bottom-navigation',
  imports: [RouterLink, RouterLinkActive, SignalMotion],
  templateUrl: './bottom-navigation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigation {
  protected readonly activity = inject(ActivityStore);
  readonly #router = inject(Router);
  readonly #path = toSignal(
    this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.#router.url.split('?')[0] },
  );
  protected readonly visible = computed(() =>
    ['/activity', '/computer', '/settings', '/usage-limits'].includes(this.#path()),
  );
  protected readonly position = computed(() =>
    this.#path() === '/computer' ? 1 : this.#path() === '/settings' ? 2 : 0,
  );
}
