import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BottomNavigation } from '../../../core/navigation/ui/bottom-navigation';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { UpdateStore } from '../../../core/updates/update.store';
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

  ngOnInit(): void {
    this.activity.start();
    this.updates.start();
  }

  ngOnDestroy(): void {
    this.activity.stop();
    this.updates.stop();
  }

  protected allowanceStatus(remaining: number, reached: boolean): string {
    if (reached || remaining <= 0) return 'Đã hết';
    if (remaining <= 5) return 'Gần hết';
    if (remaining <= 20) return 'Sắp thấp';
    return 'Còn tốt';
  }
}
