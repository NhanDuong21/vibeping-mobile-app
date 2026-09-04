import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { ProjectIdentity } from '../../personal';
import { activityDescription, activityLabel } from '../application/activity-presentation';
import { ActivityStore } from '../application/activity.store';
import { threadTitle } from '../application/thread-presentation';
import { sessionDuration, sessionStatus } from '../application/work-session-presentation';
import { RequestContent } from './request-content';
import { SessionWorkingSignal } from './session-working-signal';

/** Notification links resolve to their inline request; standalone legacy remains readable. */
@Component({
  selector: 'app-event-detail-page',
  imports: [RouterLink, PullToRefresh, ProjectIdentity, SessionWorkingSignal, RequestContent],
  templateUrl: './event-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailPage {
  protected readonly activity = inject(ActivityStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #active = signal(true);
  readonly #id = signal('');
  protected readonly legacyEvent = computed(() => {
    const event = this.activity.selected();
    return event?.session?.thread ? null : event;
  });
  protected readonly label = activityLabel;
  protected readonly taskTitle = threadTitle;
  protected readonly description = activityDescription;
  protected readonly sessionDuration = sessionDuration;
  protected readonly sessionStatus = sessionStatus;

  constructor() {
    this.#route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.#id.set(params.get('id') ?? '');
      void this.activity.loadDetail(this.#id());
    });
    effect(() => {
      const event = this.activity.selected();
      if (
        this.#active() &&
        event?.session?.thread &&
        (event.id === this.#id() || event.session.eventIds.includes(this.#id()))
      ) {
        void this.#router.navigate(['/activity/sessions', event.session.thread.id], {
          replaceUrl: true,
          queryParams: { request: event.id },
        });
      }
    });
  }
  ionViewWillEnter(): void {
    this.#active.set(true);
    if (this.activity.selected()?.id !== this.#id()) void this.activity.loadDetail(this.#id());
  }
  ionViewDidLeave(): void {
    this.#active.set(false);
  }
}
