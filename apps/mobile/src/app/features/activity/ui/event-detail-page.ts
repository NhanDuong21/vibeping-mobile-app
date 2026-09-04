import { SignalMotion } from '../../../core/motion/signal-motion';
import { ProjectIdentity } from '../../personal';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ActivityEventDetailDto } from '../../../core/api/api-client';
import { clock, exactDateTime } from '../../../core/formatting/time';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import {
  activityDescription,
  activityLabel,
  activityProject,
  timelineLabel,
} from '../application/activity-presentation';
import { ActivityStore } from '../application/activity.store';
import { ResultBody } from './result-body';
import { SessionWorkingSignal } from './session-working-signal';
import { sessionDuration, sessionStatus } from '../application/work-session-presentation';
import { turnTitle } from '../application/thread-presentation';
import { TimelineMarker } from './timeline-marker';

@Component({
  selector: 'app-event-detail-page',
  imports: [
    SignalMotion,
    RouterLink,
    PullToRefresh,
    ResultBody,
    ProjectIdentity,
    SessionWorkingSignal,
    TimelineMarker,
  ],
  templateUrl: './event-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailPage {
  protected readonly activity = inject(ActivityStore);
  protected readonly label = activityLabel;
  protected readonly taskTitle = turnTitle;
  protected readonly backLink = computed(() => {
    const thread = this.activity.selected()?.session?.thread;
    return thread ? ['/activity/sessions', thread.id] : ['/activity'];
  });
  protected readonly project = activityProject;
  protected readonly description = activityDescription;
  protected readonly sessionDuration = sessionDuration;
  protected readonly sessionStatus = sessionStatus;
  protected readonly exactTime = exactDateTime;
  protected readonly stageTime = clock;
  protected readonly stageLabel = (stage: ActivityEventDetailDto['timeline'][number]): string =>
    timelineLabel(stage);
  readonly #route = inject(ActivatedRoute);

  constructor() {
    this.#route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => void this.activity.loadDetail(params.get('id') ?? ''));
  }

  ionViewWillEnter(): void {
    const id = this.#route.snapshot.paramMap.get('id') ?? '';
    if (this.activity.selected()?.id !== id) void this.activity.loadDetail(id);
  }
}
