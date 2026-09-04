import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ComputerStatusDto } from '../../../core/api/api-client';
import { SignalMotion, MotionInView } from '../../../core/motion/signal-motion';
import { computerSignal } from '../application/computer-signal';

@Component({
  selector: 'app-signal-pipeline',
  imports: [SignalMotion, MotionInView],
  template: ` <section
    class="mb-6 rounded-2xl bg-vibe-surface px-3 py-5 dark:bg-vibe-surface-dark"
    aria-labelledby="pipeline-heading"
    appMotionInView
  >
    <h2 id="pipeline-heading" class="px-1 text-base font-bold">Đường đi tín hiệu</h2>
    <div class="relative mt-5">
      <svg
        class="pointer-events-none absolute left-[10%] top-5 h-1 w-4/5 overflow-visible text-vibe-mint"
        viewBox="0 0 100 2"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 1H100"
          class="stroke-vibe-rule dark:stroke-vibe-rule-dark"
          stroke="currentColor"
          stroke-width="0.7"
          stroke-dasharray="2 2"
        />
        <path
          [attr.d]="'M0 1H' + signal().reached * 25"
          pathLength="1"
          appSignalMotion="draw"
          [motionKey]="status()"
          stroke="currentColor"
          stroke-width="1"
        />
      </svg>
      <ol class="relative grid grid-cols-5">
        @for (node of signal().nodes; track node.label; let index = $index) {
          <li
            class="flex min-w-0 flex-col items-center gap-2 text-center"
            [attr.data-signal-ready]="node.ready"
          >
            <span
              class="grid size-10 place-items-center rounded-full border-2 bg-vibe-surface dark:bg-vibe-surface-dark"
              appSignalMotion="ping"
              [motionDelay]="index * 55"
              [motionKey]="status()"
              [class]="
                node.ready
                  ? 'border-vibe-mint text-vibe-green dark:text-vibe-mint'
                  : 'border-vibe-amber text-vibe-ink dark:text-vibe-paper'
              "
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path [attr.d]="node.path" />
              </svg>
            </span>
            <span class="text-[0.6875rem] font-bold">{{ node.label }}</span>
            <span class="sr-only">{{ node.ready ? 'Sẵn sàng' : 'Cần kiểm tra' }}</span>
          </li>
        }
      </ol>
    </div>
    <p class="mt-4 px-1 text-xs leading-5 text-vibe-muted dark:text-vibe-sage">
      {{ signal().message }}
    </p>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalPipeline {
  readonly status = input.required<ComputerStatusDto>();
  protected readonly signal = computed(() => computerSignal(this.status()));
}
