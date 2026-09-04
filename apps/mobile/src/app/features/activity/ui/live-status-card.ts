import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { elapsedTime, relativeSignalTime, relativeTime } from '../../../core/formatting/time';
import { activityProject, activityTaskTitle } from '../application/activity-presentation';
import { ActivityStore } from '../application/activity.store';
import { MotionInView, SignalMotion } from '../../../core/motion/signal-motion';
import { eventMotionCue } from '../application/event-motion';

@Component({
  selector: 'app-live-status-card',
  imports: [RouterLink, SignalMotion, MotionInView],
  templateUrl: './live-status-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveStatusCard {
  protected readonly activity = inject(ActivityStore);
  protected readonly recent = computed(() => this.activity.events()[0] ?? null);
  protected readonly cue = computed(() =>
    eventMotionCue(this.activity.events().find((event) => event.id === this.activity.newEventId())),
  );

  protected workTitle(): string {
    const kind = this.activity.readiness().kind;
    if (kind === 'waiting') return 'Cần xác nhận để tiếp tục';
    if (kind === 'failed') return 'Lần kiểm thử Codex ghi nhận chưa đạt';
    if (kind === 'preview') return 'Bản xem trước của công việc hiện tại';
    if (kind === 'unconfirmed') return 'Công việc ghi nhận gần nhất';
    return 'Công việc hiện tại';
  }

  protected projectName(): string {
    const current = this.activity.current();
    if (current) {
      return activityProject({
        id: '',
        eventType: '',
        title: '',
        summary: '',
        projectName: current.projectName,
        occurredAt: current.updatedAt,
        isRead: true,
      });
    }
    const recent = this.recent();
    return recent ? activityProject(recent) : 'Codex';
  }

  protected recentTitle(): string {
    const event = this.recent();
    return event ? activityTaskTitle(event) : 'Công việc trong Codex';
  }

  protected elapsed(): string {
    const current = this.activity.current();
    return current ? elapsedTime(current.startedAt, this.activity.now()) : '';
  }

  protected lastSignal(): string {
    const current = this.activity.current();
    return current ? relativeSignalTime(current.updatedAt, this.activity.now()) : '';
  }

  protected recentTime(): string {
    const event = this.recent();
    return event ? relativeTime(event.occurredAt, this.activity.now()) : '';
  }
}
