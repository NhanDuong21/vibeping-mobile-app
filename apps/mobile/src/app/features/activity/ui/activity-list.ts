import { SignalMotion } from '../../../core/motion/signal-motion';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectIdentity } from '../../personal';
import { relativeTime } from '../../../core/formatting/time';
import {
  activityLabel,
  activityProject,
  activityPreview,
} from '../application/activity-presentation';
import { ActivityStore } from '../application/activity.store';
import { WorkSessionCard } from './work-session-card';
import { threadIdentity, threadSections } from '../application/thread-presentation';

@Component({
  selector: 'app-activity-list',
  imports: [SignalMotion, RouterLink, WorkSessionCard, ProjectIdentity],
  templateUrl: './activity-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityList {
  protected readonly activity = inject(ActivityStore);
  protected readonly groups = computed(() =>
    threadSections(
      this.activity.threads(),
      this.activity.focusedSession(),
      this.activity.now(),
      this.activity.isStale(),
    ),
  );
  protected readonly identity = threadIdentity;
  protected readonly label = activityLabel;
  protected readonly preview = activityPreview;
  protected readonly project = activityProject;

  protected time(value: string): string {
    return relativeTime(value, this.activity.now());
  }
}
