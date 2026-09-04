import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SegmentedControl } from '../../../core/forms/ui/segmented-control';
import {
  MotionPreferenceStore,
  type MotionLevel,
} from '../../../core/motion/motion-preference.store';

@Component({
  selector: 'app-motion-settings',
  imports: [SegmentedControl],
  template: ` <section
    class="mt-8 border-t border-vibe-rule pt-6 dark:border-vibe-rule-dark"
    aria-labelledby="motion-heading"
  >
    <h2 id="motion-heading" class="text-[1.375rem] font-bold tracking-[-0.025em]">Chuyển động</h2>
    <p class="mt-1.5 text-sm leading-6 text-vibe-muted dark:text-vibe-sage">
      Chọn nhịp chuyển động cho VibePing trên điện thoại này.
    </p>
    <app-segmented-control
      class="mt-3 block"
      label="Mức chuyển động"
      [options]="options"
      [value]="motion.level()"
      (selected)="set($event)"
    />
    <p class="mt-3 text-xs leading-5 text-vibe-muted dark:text-vibe-sage" aria-live="polite">
      @if (motion.reduced()) {
        iPhone đang bật Giảm chuyển động. VibePing dùng mức Tối giản.
      } @else if (motion.level() === 'full') {
        Tín hiệu chuyển động khi đang làm việc, phản hồi rõ khi có hoạt động mới.
      } @else if (motion.level() === 'balanced') {
        Giữ phản hồi ngắn, dừng các chuyển động lặp.
      } @else {
        Hiển thị trạng thái ngay, không có hiệu ứng chuyển động.
      }
    </p>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotionSettings {
  protected readonly motion = inject(MotionPreferenceStore);
  protected readonly options = [
    { value: 'full', label: 'Tối đa' },
    { value: 'balanced', label: 'Vừa phải' },
    { value: 'minimal', label: 'Tối giản' },
  ];
  protected set(value: string | number): void {
    this.motion.set(value as MotionLevel);
  }
}
