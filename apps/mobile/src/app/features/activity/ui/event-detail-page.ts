import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BottomNavigation } from '../../../core/navigation/ui/bottom-navigation';
import { ActivityStore } from '../application/activity.store';

@Component({
  selector: 'app-event-detail-page',
  imports: [RouterLink, BottomNavigation],
  templateUrl: './event-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailPage implements OnInit, OnDestroy {
  protected readonly activity = inject(ActivityStore);
  readonly #route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.activity.start();
    void this.activity.loadDetail(this.#route.snapshot.paramMap.get('id') ?? '');
  }

  ngOnDestroy(): void {
    this.activity.stop();
  }
}
