import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { exactDateTime } from '../../../core/formatting/time';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { ProjectIdentity } from '../../personal';
import { ActivityStore } from '../application/activity.store';
import { ThreadDetailStore } from '../application/thread-detail.store';
import { threadTitle } from '../application/thread-presentation';
import { RequestPanel } from './request-panel';

@Component({
  selector: 'app-thread-detail-page',
  imports: [RouterLink, PullToRefresh, ProjectIdentity, RequestPanel],
  templateUrl: './thread-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadDetailPage {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  protected readonly thread = inject(ThreadDetailStore);
  protected readonly activity = inject(ActivityStore);
  protected readonly title = threadTitle;
  protected readonly exactTime = exactDateTime;
  constructor() {
    effect(() => {
      const canonical = this.thread.canonicalId();
      const requested = this.#route.snapshot.paramMap.get('id');
      if (
        canonical &&
        requested &&
        canonical !== requested &&
        this.thread.state() === 'ready' &&
        this.#router.url.split('?')[0] === `/activity/sessions/${requested}`
      ) {
        void this.#router.navigate(['/activity/sessions', canonical], {
          queryParamsHandling: 'preserve',
          replaceUrl: true,
        });
      }
    });
    combineLatest([this.#route.paramMap, this.#route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        void this.thread.open(params.get('id') ?? '', query.get('request'));
      });
  }
  ionViewWillEnter(): void {
    void this.thread.open(
      this.#route.snapshot.paramMap.get('id') ?? '',
      this.#route.snapshot.queryParamMap.get('request'),
    );
  }
}
