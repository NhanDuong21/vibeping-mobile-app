import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectIdentity } from '../../personal';
import type { ActivityEventDto } from '../../../core/api/api-client';
import { clock } from '../../../core/formatting/time';
import { SignalMotion } from '../../../core/motion/signal-motion';
import { timelineLabel } from '../application/activity-presentation';
import { liveSessionDuration, sessionStatus } from '../application/work-session-presentation';
import {
  resultPreview,
  threadIdentity,
  threadStatus,
  threadTitle,
} from '../application/thread-presentation';

@Component({
  selector: 'app-work-session-card',
  imports: [RouterLink, SignalMotion, ProjectIdentity],
  templateUrl: './work-session-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkSessionCard {
  readonly event = input.required<ActivityEventDto>();
  readonly now = input.required<Date>();
  readonly stale = input(false);
  readonly prominent = input(false);
  readonly reaction = input<string | null>(null);
  readonly entrance = input<string | null>(null);
  protected readonly title = computed(() => threadTitle(this.event()));
  protected readonly status = computed(() =>
    this.event().session?.thread
      ? threadStatus(this.event(), this.now(), this.stale())
      : sessionStatus(this.event(), this.now(), this.stale()),
  );
  protected readonly duration = computed(() =>
    this.event().session?.startedAt
      ? liveSessionDuration(this.event(), this.now(), this.stale())
      : '',
  );
  protected readonly identity = computed(() => threadIdentity(this.event()));
  protected readonly preview = computed(() => resultPreview(this.event()));
  protected readonly link = computed(() =>
    this.event().session?.thread
      ? ['/activity/sessions', this.identity()]
      : ['/activity/events', this.event().id],
  );
  protected readonly clock = clock;
  protected readonly stageLabel = timelineLabel;
}
