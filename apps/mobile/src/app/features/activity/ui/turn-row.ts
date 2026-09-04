import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ActivityEventDto } from '../../../core/api/api-client';
import { clock } from '../../../core/formatting/time';
import { SignalMotion } from '../../../core/motion/signal-motion';
import { failureNote, resultPreview, turnTitle } from '../application/thread-presentation';
import { sessionDuration, sessionStatus } from '../application/work-session-presentation';

@Component({
  selector: 'app-turn-row',
  imports: [RouterLink, SignalMotion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/activity/events', event().id]"
      [attr.data-turn-id]="event().id"
      class="relative block min-h-11 min-w-0 py-4 pr-6 text-vibe-ink! active:bg-vibe-mint-soft/60 dark:text-vibe-paper! dark:active:bg-vibe-mint/10"
      appSignalMotion="arrive"
      [motionKey]="reaction()"
      [motionDelay]="60"
    >
      <p class="text-sm font-bold">Lượt {{ event().session?.thread?.turnNumber }}</p>
      @if (event().session?.taskLabel) {
        <p class="mt-1 line-clamp-2 break-words text-base font-bold leading-6">{{ title() }}</p>
      }
      <p class="mt-2 text-sm leading-6">
        <span class="tabular-nums">{{ times() }}</span> · {{ status() }}
        @if (duration()) {
          · {{ duration() }}
        }
      </p>
      @if (failures()) {
        <p class="mt-1 text-xs leading-5 text-vibe-muted dark:text-vibe-sage">{{ failures() }}</p>
      }
      @if (!event().session?.startedAt) {
        <p class="mt-1 text-xs text-vibe-muted dark:text-vibe-sage">
          Không ghi nhận thời điểm bắt đầu
        </p>
      }
      @if (preview()) {
        <p class="mt-2 line-clamp-2 break-words text-sm leading-6">{{ preview() }}</p>
      }
      <svg
        class="absolute right-0 top-1/2 size-4 text-vibe-muted dark:text-vibe-sage"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </a>
  `,
})
export class TurnRow {
  readonly event = input.required<ActivityEventDto>();
  readonly now = input.required<Date>();
  readonly stale = input(false);
  readonly reaction = input<string | null>(null);
  protected readonly title = computed(() => turnTitle(this.event()));
  protected readonly status = computed(() => sessionStatus(this.event(), this.now(), this.stale()));
  protected readonly duration = computed(() =>
    this.event().session?.startedAt ? sessionDuration(this.event(), this.now(), this.stale()) : '',
  );
  protected readonly failures = computed(() => failureNote(this.event()));
  protected readonly preview = computed(() => resultPreview(this.event()));
  protected readonly times = computed(() => {
    const turn = this.event().session;
    const start = turn?.startedAt ? clock(turn.startedAt) : '';
    const finish = turn?.completedAt ? clock(turn.completedAt) : '';
    return start && finish
      ? `${start}–${finish}`
      : start || finish || clock(this.event().occurredAt);
  });
}
