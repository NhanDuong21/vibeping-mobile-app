import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  template: `
    <button
      type="button"
      role="switch"
      class="grid min-h-11 min-w-14 shrink-0 place-items-center transition-transform active:scale-95"
      [attr.aria-checked]="checked"
      [attr.aria-label]="label"
      (click)="changed.emit()"
    >
      <span
        class="relative h-7 w-12 rounded-full transition-colors motion-reduce:transition-none"
        [class]="checked ? 'bg-vibe-mint' : 'bg-vibe-rule dark:bg-vibe-rule-dark'"
        aria-hidden="true"
      >
        <span
          class="absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1.5,0.36,1)] motion-reduce:transition-none"
          [class.translate-x-5]="checked"
        ></span>
      </span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitch {
  @Input({ required: true }) checked = false;
  @Input({ required: true }) label = '';
  @Output() readonly changed = new EventEmitter<void>();
}
