import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { clock, exactDateTime } from '../../../core/formatting/time';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { ProjectIdentity } from '../../personal';
import { ActivityStore } from '../application/activity.store';
import { ThreadDetailStore } from '../application/thread-detail.store';
import {
  failureNote,
  attentionNote,
  needsAttention,
  threadSpan,
  threadStatus,
  threadTitle,
  turnTitle,
} from '../application/thread-presentation';
import { sessionDuration } from '../application/work-session-presentation';
import { TurnRow } from './turn-row';
import { SignalMotion } from '../../../core/motion/signal-motion';

@Component({
  selector: 'app-thread-detail-page',
  imports: [RouterLink, PullToRefresh, ProjectIdentity, TurnRow, SignalMotion],
  templateUrl: './thread-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadDetailPage {
  readonly #route = inject(ActivatedRoute);
  protected readonly thread = inject(ThreadDetailStore);
  protected readonly activity = inject(ActivityStore);
  protected readonly title = threadTitle;
  protected readonly turnTitle = turnTitle;
  protected readonly status = threadStatus;
  protected readonly span = threadSpan;
  protected readonly failures = failureNote;
  protected readonly attention = needsAttention;
  protected readonly attentionNote = attentionNote;
  protected readonly duration = sessionDuration;
  protected readonly clock = clock;
  protected readonly exactTime = exactDateTime;
  constructor() {
    this.#route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => void this.thread.open(params.get('id') ?? ''));
  }

  ionViewWillEnter(): void {
    void this.thread.open(this.#route.snapshot.paramMap.get('id') ?? '');
  }
}
