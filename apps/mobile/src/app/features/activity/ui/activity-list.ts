import { SignalMotion } from '../../../core/motion/signal-motion';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { relativeTime } from '../../../core/formatting/time';
import {
  activityLabel,
  activityProject,
  activityTaskTitle,
  groupActivityEvents,
} from '../application/activity-presentation';
import { ActivityStore } from '../application/activity.store';

@Component({
  selector: 'app-activity-list',
  imports: [SignalMotion, RouterLink],
  templateUrl: './activity-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityList {
  protected readonly activity = inject(ActivityStore);
  protected readonly groups = computed(() =>
    groupActivityEvents(this.activity.events(), this.activity.now()),
  );
  protected readonly label = activityLabel;
  protected readonly taskTitle = activityTaskTitle;
  protected readonly project = activityProject;

  protected time(value: string): string {
    return relativeTime(value, this.activity.now());
  }
}
