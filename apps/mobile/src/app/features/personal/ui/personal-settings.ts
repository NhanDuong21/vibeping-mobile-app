import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PersonalStore } from '../application/personal.store';
import { WindowsReadiness } from './windows-readiness';

@Component({
  selector: 'app-personal-settings',
  imports: [RouterLink, WindowsReadiness],
  template: `<section
      class="mt-8 border-t border-vibe-rule pt-6 dark:border-vibe-rule-dark"
      aria-labelledby="personal-heading"
    >
      <h2 id="personal-heading" class="text-[1.375rem] font-bold tracking-[-0.025em]">
        Báo theo cách của bạn
      </h2>
      <p class="mt-1.5 text-sm leading-6 text-vibe-muted dark:text-vibe-sage">
        Việc cần bạn và kiểm thử cuối chưa đạt vẫn báo ngay, theo loại thông báo và giờ yên tĩnh đã
        chọn.
      </p>
      @if (personal.rules(); as rules) {
        <fieldset
          class="mt-4 space-y-4 disabled:opacity-60"
          [disabled]="personal.ruleSave() === 'saving'"
        >
          <label class="block text-sm font-bold"
            >Thông báo hoàn tất
            <select
              #completion
              class="mt-2 min-h-12 w-full rounded-xl border border-vibe-rule bg-vibe-canvas px-3 text-base font-medium dark:border-vibe-rule-dark dark:bg-vibe-night"
              [value]="rules.completionMinMinutes"
              (change)="personal.setRule('completionMinMinutes', completion.value)"
            >
              <option value="0">Mọi công việc</option>
              <option value="2">Từ 2 phút trở lên</option>
              <option value="5">Từ 5 phút trở lên</option>
            </select>
          </label>
          <label class="block text-sm font-bold"
            >Nhắc lại khi Codex đang chờ
            <select
              #waiting
              class="mt-2 min-h-12 w-full rounded-xl border border-vibe-rule bg-vibe-canvas px-3 text-base font-medium dark:border-vibe-rule-dark dark:bg-vibe-night"
              [value]="rules.waitingReminderMinutes"
              (change)="personal.setRule('waitingReminderMinutes', waiting.value)"
            >
              <option value="0">Không nhắc</option>
              <option value="5">Một lần sau 5 phút</option>
              <option value="10">Một lần sau 10 phút</option>
            </select>
          </label>
        </fieldset>
        <p class="mt-2 text-xs leading-5 text-vibe-muted dark:text-vibe-sage">
          Nếu chưa ghi nhận thời điểm bắt đầu, VibePing vẫn báo hoàn tất.
        </p>
        <p class="mt-2 text-sm font-semibold" aria-live="polite">
          {{
            personal.ruleSave() === 'saving'
              ? 'Đang lưu lựa chọn…'
              : personal.ruleSave() === 'saved'
                ? 'Đã lưu lựa chọn.'
                : personal.ruleSave() === 'failed'
                  ? 'Chưa lưu được. Kiểm tra kết nối rồi chọn lại.'
                  : personal.ruleState() === 'cached'
                    ? 'Lựa chọn đã lưu trên điện thoại. Kết nối laptop để thay đổi.'
                    : ''
          }}
        </p>
      } @else {
        <p class="mt-3 text-sm text-vibe-muted dark:text-vibe-sage">
          {{
            personal.ruleState() === 'loading'
              ? 'Đang đọc lựa chọn…'
              : 'Chưa đọc được lựa chọn thông báo.'
          }}
        </p>
        @if (personal.ruleState() === 'unavailable') {
          <button
            class="min-h-11 text-sm font-bold underline underline-offset-4"
            (click)="personal.loadRules()"
          >
            Thử lại
          </button>
        }
      }
      <a
        routerLink="/settings/projects"
        class="mt-4 flex min-h-14 items-center justify-between gap-4 border-y border-vibe-rule py-3 text-vibe-ink! dark:border-vibe-rule-dark dark:text-vibe-paper!"
      >
        <span
          ><span class="block font-bold">Dự án của bạn</span
          ><span class="mt-1 block text-sm text-vibe-muted dark:text-vibe-sage"
            >Tên, biểu tượng, thông báo và lịch sử riêng</span
          ></span
        ><span aria-hidden="true">→</span>
      </a>
    </section>
    <app-windows-readiness />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalSettings {
  readonly personal = inject(PersonalStore);
  constructor() {
    void this.personal.loadRules();
  }
}
