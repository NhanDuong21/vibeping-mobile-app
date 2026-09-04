import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WindowsReadinessStore } from '../application/windows-readiness.store';
@Component({
  selector: 'app-windows-readiness',
  providers: [WindowsReadinessStore],
  template: `<section
    class="mt-8 border-t border-vibe-rule pt-6 dark:border-vibe-rule-dark"
    aria-labelledby="windows-heading"
  >
    <h2 id="windows-heading" class="text-[1.375rem] font-bold tracking-[-0.025em]">
      Sẵn sàng trên Windows
    </h2>
    <p class="mt-3 flex items-center gap-2 text-sm font-bold" aria-live="polite">
      <span
        class="size-2 shrink-0 rounded-full"
        [class.bg-vibe-mint]="ready.status()?.state === 'healthy' && ready.state() === 'ready'"
        [class.bg-vibe-amber]="ready.status()?.state !== 'healthy' || ready.state() !== 'ready'"
        aria-hidden="true"
      ></span
      >{{ ready.label() }}
    </p>
    @if (ready.lastCheck(); as lastCheck) {
      <p class="mt-2 text-sm leading-6 text-vibe-muted dark:text-vibe-sage">{{ lastCheck }}</p>
    }
    @if (ready.state() === 'ready' && ready.status(); as status) {
      <p class="mt-2 text-sm leading-6 text-vibe-muted dark:text-vibe-sage">
        {{
          status.autoStart
            ? 'Tự khởi động khi bạn đăng nhập Windows.'
            : 'Khởi động khi đăng nhập đang tắt.'
        }}
      </p>
    }
    <p class="mt-2 text-sm leading-6 text-vibe-muted dark:text-vibe-sage">
      Bật bằng “Bật Sẵn sàng” trong gói Windows. Khay mèo giúp mở app, dừng máy chủ hoặc đổi lựa
      chọn khởi động. Khi bạn bấm Dừng, VibePing chờ bạn bật lại hoặc lần đăng nhập Windows tiếp
      theo.
    </p>
    <button
      class="mt-2 min-h-11 text-sm font-bold text-vibe-green underline underline-offset-4 disabled:opacity-50 dark:text-vibe-mint"
      [disabled]="ready.state() === 'loading'"
      (click)="ready.load()"
    >
      Kiểm tra lại laptop
    </button>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WindowsReadiness {
  readonly ready = inject(WindowsReadinessStore);
  constructor() {
    void this.ready.load();
  }
}
