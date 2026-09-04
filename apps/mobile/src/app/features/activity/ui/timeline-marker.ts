import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-timeline-marker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="relative grid size-5 place-items-center rounded-full bg-vibe-canvas ring-4 ring-vibe-canvas dark:bg-vibe-night dark:ring-vibe-night"
      aria-hidden="true"
    >
      @switch (type()) {
        @case ('codex.test.failed') {
          <svg
            class="size-4 text-vibe-coral"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        }
        @case ('codex.test.passed') {
          <svg
            class="size-4 text-vibe-green dark:text-vibe-mint"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m4 12 5 5L20 6" />
          </svg>
        }
        @case ('codex.turn.completed') {
          <svg
            class="size-5 text-vibe-ink dark:text-vibe-paper"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <path d="m4 12 5 5L20 6" />
          </svg>
        }
        @case ('codex.turn.stopped') {
          <svg class="size-4 text-vibe-amber" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
        }
        @case ('codex.attention.permission_required') {
          <svg
            class="size-4 text-vibe-amber"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M9 5v14M15 5v14" />
          </svg>
        }
        @case ('codex.turn.started') {
          <svg
            class="size-4 text-vibe-green dark:text-vibe-mint"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="m7 4 13 8-13 8z" />
          </svg>
        }
        @default {
          <span class="size-2 rounded-full bg-vibe-mint"></span>
        }
      }
    </span>
  `,
})
export class TimelineMarker {
  readonly type = input.required<string>();
}
