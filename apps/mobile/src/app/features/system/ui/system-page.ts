import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ConnectivityStore } from '../../../core/connectivity/connectivity.store';
import { ActivityStore } from '../application/activity.store';

@Component({
  selector: 'app-system-page',
  templateUrl: './system-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemPage implements OnInit, OnDestroy {
  protected readonly connectivity = inject(ConnectivityStore);
  protected readonly activity = inject(ActivityStore);

  ngOnInit(): void {
    this.connectivity.start();
    this.activity.start();
  }

  ngOnDestroy(): void {
    this.connectivity.stop();
    this.activity.stop();
  }
}
