import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BottomNavigation } from '../../../core/navigation/ui/bottom-navigation';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { UsageLimitsStore } from '../application/usage-limits.store';

@Component({
  selector: 'app-usage-limits-page',
  imports: [RouterLink, BottomNavigation, PullToRefresh],
  templateUrl: './usage-limits-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsageLimitsPage implements OnInit, OnDestroy {
  protected readonly usage = inject(UsageLimitsStore);

  ngOnInit(): void {
    this.usage.start();
  }

  ngOnDestroy(): void {
    this.usage.stop();
  }
}
