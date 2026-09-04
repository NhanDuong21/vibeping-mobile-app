import { AnimatedPercent } from '../../../core/motion/animated-percent';
import { SignalMotion } from '../../../core/motion/signal-motion';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { UsageLimitsStore } from '../../usage-limits';
import { ActivityStore } from '../application/activity.store';
import { ActivityList } from './activity-list';
import { LiveStatusCard } from './live-status-card';

@Component({
  selector: 'app-activity-page',
  imports: [AnimatedPercent, SignalMotion, RouterLink, PullToRefresh, ActivityList, LiveStatusCard],
  templateUrl: './activity-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityPage {
  protected readonly activity = inject(ActivityStore);
  protected readonly usage = inject(UsageLimitsStore);
}
