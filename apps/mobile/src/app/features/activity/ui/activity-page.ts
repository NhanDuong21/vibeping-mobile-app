import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BottomNavigation } from '../../../core/navigation/ui/bottom-navigation';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { UpdateStore } from '../../../core/updates/update.store';
import { UsageLimitsStore } from '../../usage-limits';
import { ActivityStore } from '../application/activity.store';
import { ActivityList } from './activity-list';
import { LiveStatusCard } from './live-status-card';

@Component({
  selector: 'app-activity-page',
  imports: [RouterLink, BottomNavigation, PullToRefresh, ActivityList, LiveStatusCard],
  templateUrl: './activity-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityPage implements OnInit, OnDestroy {
  protected readonly activity = inject(ActivityStore);
  protected readonly updates = inject(UpdateStore);
  protected readonly usage = inject(UsageLimitsStore);

  ngOnInit(): void {
    this.activity.start();
    this.updates.start();
  }

  ngOnDestroy(): void {
    this.activity.stop();
    this.updates.stop();
  }
}
