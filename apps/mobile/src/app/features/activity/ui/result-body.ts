import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { resultBlocks } from '../application/result-blocks';

@Component({
  selector: 'app-result-body',
  template: `
    <div class="mt-4 space-y-4 text-[0.9375rem] leading-7 [overflow-wrap:anywhere]">
      @for (block of blocks(); track $index) {
        @switch (block.kind) {
          @case ('heading') {
            <h3 class="pt-2 text-base font-bold">{{ block.lines[0] }}</h3>
          }
          @case ('list') {
            <ul class="list-disc space-y-2 pl-5 marker:text-vibe-green dark:marker:text-vibe-mint">
              @for (line of block.lines; track $index) {
                <li>{{ line }}</li>
              }
            </ul>
          }
          @case ('code') {
            <pre
              class="whitespace-pre-wrap rounded-xl bg-vibe-mint-soft/60 p-4 font-mono text-xs leading-6 dark:bg-vibe-mint/5"
              >{{ codeText(block.lines) }}</pre
            >
          }
          @default {
            <p class="whitespace-pre-wrap">{{ block.lines[0] }}</p>
          }
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultBody {
  readonly text = input.required<string>();
  protected readonly blocks = computed(() => resultBlocks(this.text()));
  protected readonly codeText = (lines: string[]): string => lines.join('\n');
}
