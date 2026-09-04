import { SignalMotion } from '../../../core/motion/signal-motion';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ActivityEventDetailDto } from '../../../core/api/api-client';
import { clock, exactDateTime } from '../../../core/formatting/time';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import {
  activityDescription,
  activityLabel,
  activityProject,
  activityTaskTitle,
  timelineLabel,
} from '../application/activity-presentation';
import { ActivityStore } from '../application/activity.store';

@Component({
  selector: 'app-event-detail-page',
  imports: [SignalMotion, RouterLink, PullToRefresh],
  templateUrl: './event-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailPage implements OnInit {
  protected readonly activity = inject(ActivityStore);
  protected readonly label = activityLabel;
  protected readonly taskTitle = activityTaskTitle;
  protected readonly project = activityProject;
  protected readonly description = activityDescription;
  protected readonly exactTime = exactDateTime;
  protected readonly stageTime = clock;
  protected readonly stageLabel = (stage: ActivityEventDetailDto['timeline'][number]): string =>
    timelineLabel(stage);
  readonly #route = inject(ActivatedRoute);

  ngOnInit(): void {
    void this.activity.loadDetail(this.#route.snapshot.paramMap.get('id') ?? '');
  }
}
