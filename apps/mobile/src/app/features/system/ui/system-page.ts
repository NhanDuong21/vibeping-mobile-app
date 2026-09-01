import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ConnectivityStore } from '../../../core/connectivity/connectivity.store';

@Component({
  selector: 'app-system-page',
  templateUrl: './system-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemPage implements OnInit, OnDestroy {
  protected readonly connectivity = inject(ConnectivityStore);

  ngOnInit(): void {
    this.connectivity.start();
  }

  ngOnDestroy(): void {
    this.connectivity.stop();
  }
}
