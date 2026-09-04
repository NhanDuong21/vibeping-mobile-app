import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ActivityEventDto } from '../../../core/api/api-client';
import { clock } from '../../../core/formatting/time';
import { SignalMotion } from '../../../core/motion/signal-motion';
import {
  activityProject,
  activityTaskTitle,
  timelineLabel,
} from '../application/activity-presentation';
import { sessionDuration, sessionStatus } from '../application/work-session-presentation';

@Component({
  selector: 'app-work-session-card',
  imports: [RouterLink, SignalMotion],
  templateUrl: './work-session-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkSessionCard {
  readonly event = input.required<ActivityEventDto>();
  readonly now = input.required<Date>();
  readonly stale = input(false);
  readonly prominent = input(false);
  readonly reaction = input<string | null>(null);
  protected readonly title = computed(() => activityTaskTitle(this.event()));
  protected readonly project = computed(() => activityProject(this.event()));
  protected readonly status = computed(() => sessionStatus(this.event(), this.now(), this.stale()));
  protected readonly duration = computed(() =>
    sessionDuration(this.event(), this.now(), this.stale()),
  );
  protected readonly clock = clock;
  protected readonly stageLabel = timelineLabel;
}
