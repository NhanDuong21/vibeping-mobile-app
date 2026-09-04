import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ActivityEventDetailDto } from '../../../core/api/api-client';
import { clock, exactDateTime } from '../../../core/formatting/time';
import { SignalMotion } from '../../../core/motion/signal-motion';
import { ActivityStore } from '../application/activity.store';
import { timelineLabel } from '../application/activity-presentation';
import { sessionDuration, sessionIsWorking } from '../application/work-session-presentation';
import { ResultBody } from './result-body';
import { TimelineMarker } from './timeline-marker';

@Component({
  selector: 'app-request-content',
  imports: [SignalMotion, ResultBody, TimelineMarker],
  templateUrl: './request-content.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestContent {
  readonly event = input.required<ActivityEventDetailDto>();
  protected readonly activity = inject(ActivityStore);
  protected readonly working = computed(() =>
    sessionIsWorking(this.event(), this.activity.now(), this.activity.isStale()),
  );
  protected readonly stageTime = clock;
  protected readonly exactTime = exactDateTime;
  protected readonly stageLabel = timelineLabel;
  protected readonly sessionDuration = sessionDuration;
}
