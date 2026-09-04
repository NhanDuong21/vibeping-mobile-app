import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { UpdateStore } from './update.store';

@Component({
  selector: 'app-update-notice',
  template: ` @if (updates.available()) {
    <section
      class="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-vibe-rule bg-vibe-surface px-4 py-3 text-vibe-ink dark:border-vibe-rule-dark dark:bg-vibe-surface-dark dark:text-vibe-paper"
      aria-live="polite"
      animate.enter="animate-signal-enter"
    >
      <div>
        <p class="text-sm font-bold">Có bản VibePing mới</p>
        @if (updates.version(); as version) {
          <p class="mt-0.5 break-words text-xs font-semibold">Phiên bản {{ version }}</p>
        }
        <p class="mt-0.5 text-xs text-vibe-muted dark:text-vibe-sage">
          Cập nhật nhanh, dữ liệu gần đây vẫn được giữ lại.
        </p>
      </div>
      <button
        type="button"
        class="min-h-11 shrink-0 rounded-full bg-vibe-mint px-4 text-sm font-black text-vibe-ink transition-transform active:scale-95 disabled:opacity-60"
        [disabled]="updates.installing()"
        (click)="updates.install()"
      >
        {{ updates.installing() ? 'Đang cập nhật' : 'Cập nhật' }}
      </button>
    </section>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateNotice implements OnInit, OnDestroy {
  protected readonly updates = inject(UpdateStore);
  ngOnInit(): void {
    this.updates.start();
  }
  ngOnDestroy(): void {
    this.updates.stop();
  }
}
