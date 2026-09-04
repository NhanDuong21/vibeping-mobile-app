import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { TodaySummaryStore, observedTime } from '../application/today-summary.store';
@Component({
  selector: 'app-today-summary',
  providers: [TodaySummaryStore],
  template: `<section
    class="mt-8 border-t border-vibe-rule pt-6 dark:border-vibe-rule-dark"
    aria-labelledby="today-heading"
  >
    <h2 id="today-heading" class="text-[1.375rem] font-bold tracking-[-0.025em]">Hôm nay</h2>
    @if (today.summary(); as summary) {
      <dl class="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 text-sm">
        <dt class="text-vibe-muted dark:text-vibe-sage">Lượt đã theo dõi</dt>
        <dd class="text-right font-bold tabular-nums">{{ summary.sessions }}</dd>
        <dt class="text-vibe-muted dark:text-vibe-sage">Công việc hoàn tất</dt>
        <dd class="text-right font-bold tabular-nums">{{ summary.completed }}</dd>
        <dt class="text-vibe-muted dark:text-vibe-sage">Lần kiểm thử chưa đạt</dt>
        <dd class="text-right font-bold tabular-nums">{{ summary.failedTests }}</dd>
        <dt class="text-vibe-muted dark:text-vibe-sage">Thời gian ghi nhận</dt>
        <dd class="text-right font-bold tabular-nums">{{ time(summary.observedSeconds) }}</dd>
      </dl>
      <p class="mt-3 text-xs leading-5 text-vibe-muted dark:text-vibe-sage">
        {{ today.state() === 'cached' ? 'Tổng kết đã lưu. ' : '' }}Từ lúc bắt đầu đến tín hiệu cuối;
        các lượt trùng thời gian chỉ tính một lần.
      </p>
    } @else {
      <p class="mt-3 text-sm text-vibe-muted dark:text-vibe-sage">
        {{
          today.state() === 'loading'
            ? 'Đang đọc tổng kết…'
            : 'Tổng kết sẽ cập nhật khi kết nối lại laptop.'
        }}
      </p>
    }
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodaySummary {
  readonly revision = input<unknown>();
  readonly now = input.required<Date>();
  readonly today = inject(TodaySummaryStore);
  readonly time = observedTime;
  constructor() {
    effect(() => {
      this.revision();
      void this.today.load(this.now());
    });
  }
}
