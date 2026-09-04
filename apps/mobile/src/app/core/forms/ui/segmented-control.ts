import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface SegmentOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-segmented-control',
  template: ` <div
    class="relative isolate grid rounded-xl bg-vibe-rule/35 p-1 dark:bg-vibe-rule-dark/60"
    role="group"
    [attr.aria-label]="label()"
    [style.grid-template-columns]="columns()"
  >
    <span
      class="pointer-events-none absolute inset-y-1 left-1 -z-10 rounded-lg bg-vibe-mint-soft transition-transform duration-300 ease-[cubic-bezier(0.22,1.35,0.36,1)] dark:bg-vibe-mint"
      [style.width]="pillWidth()"
      [style.transform]="pillTransform()"
      aria-hidden="true"
    ></span>
    @for (option of options(); track option.value) {
      <button
        type="button"
        class="min-h-11 min-w-0 rounded-lg px-1 text-xs font-bold transition-transform active:scale-95"
        [class]="
          value() === option.value
            ? 'text-vibe-green dark:text-vibe-ink'
            : 'text-vibe-muted dark:text-vibe-sage'
        "
        [attr.aria-pressed]="value() === option.value"
        (click)="selected.emit(option.value)"
      >
        {{ option.label }}
      </button>
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl {
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly selected = output<string | number>();
  protected readonly columns = computed(() => `repeat(${this.options().length}, minmax(0, 1fr))`);
  protected readonly pillWidth = computed(() => `calc((100% - 0.5rem) / ${this.options().length})`);
  protected readonly pillTransform = computed(
    () =>
      `translateX(${
        Math.max(
          0,
          this.options().findIndex((option) => option.value === this.value()),
        ) * 100
      }%)`,
  );
}
