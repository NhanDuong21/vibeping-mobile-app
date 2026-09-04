import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-project-icon',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="size-4 shrink-0"
    [class.text-vibe-green]="accent() === 'mint'"
    [class.dark:text-vibe-mint]="accent() === 'mint'"
    [class.text-green-800]="accent() === 'green'"
    [class.dark:text-green-300]="accent() === 'green'"
    [class.text-blue-700]="accent() === 'blue'"
    [class.dark:text-blue-300]="accent() === 'blue'"
    [class.text-amber-800]="accent() === 'amber'"
    [class.dark:text-vibe-amber]="accent() === 'amber'"
    [class.text-red-700]="accent() === 'coral'"
    [class.dark:text-vibe-coral]="accent() === 'coral'"
    aria-hidden="true"
  >
    @switch (icon()) {
      @case ('heart') {
        <path
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
        />
        <path d="M3 11h5l2-3 3 7 2-4h6" />
      }
      @case ('book') {
        <path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2Z" />
      }
      @case ('code') {
        <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
      }
      @case ('spark') {
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
      }
      @default {
        <path d="M4 10V3l6 4h4l6-4v7a8 8 0 1 1-16 0Z" />
        <path d="M8 12h.01M16 12h.01m-6 4 2 1 2-1" />
      }
    }
  </svg>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectIcon {
  readonly icon = input('cat');
  readonly accent = input('mint');
}
