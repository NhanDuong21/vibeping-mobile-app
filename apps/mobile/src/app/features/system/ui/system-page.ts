import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ConnectivityStore } from '../../../core/connectivity/connectivity.store';
import { ActivityStore } from '../application/activity.store';
import { RouterLink } from '@angular/router';
import { UsageLimitsStore } from '../../usage-limits/application/usage-limits.store';

@Component({
  selector: 'app-system-page',
  imports: [RouterLink],
  templateUrl: './system-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemPage implements OnInit, OnDestroy {
  protected readonly connectivity = inject(ConnectivityStore);
  protected readonly activity = inject(ActivityStore);
  protected readonly usage = inject(UsageLimitsStore);

  ngOnInit(): void {
    this.connectivity.start();
    this.activity.start();
    this.usage.start();
  }

  ngOnDestroy(): void {
    this.connectivity.stop();
    this.activity.stop();
    this.usage.stop();
  }
}
