import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BottomNavigation } from '../../../core/navigation/ui/bottom-navigation';
import { ConnectivityStore } from '../../../core/connectivity/connectivity.store';
import { UpdateStore } from '../../../core/updates/update.store';
import { ActivityStore } from '../application/activity.store';

@Component({
  selector: 'app-activity-page',
  imports: [RouterLink, BottomNavigation],
  templateUrl: './activity-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityPage implements OnInit, OnDestroy {
  protected readonly connectivity = inject(ConnectivityStore);
  protected readonly activity = inject(ActivityStore);
  protected readonly updates = inject(UpdateStore);

  ngOnInit(): void {
    this.connectivity.start();
    this.activity.start();
    this.updates.start();
  }

  ngOnDestroy(): void {
    this.connectivity.stop();
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
