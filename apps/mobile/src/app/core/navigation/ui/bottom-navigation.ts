import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ActivityStore } from '../../../features/activity/application/activity.store';

@Component({
  selector: 'app-bottom-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-navigation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigation {
  protected readonly activity = inject(ActivityStore);
}
