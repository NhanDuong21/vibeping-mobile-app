import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PersonalStore } from '../application/personal.store';
import { ProjectIdentity } from './project-identity';
@Component({
  selector: 'app-projects-page',
  imports: [RouterLink, ProjectIdentity],
  template: `<div
    class="h-dvh overflow-y-auto bg-vibe-canvas px-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-[calc(env(safe-area-inset-top)+1rem)] text-vibe-ink dark:bg-vibe-night dark:text-vibe-paper"
  >
    <main class="mx-auto max-w-lg">
      <a
        routerLink="/settings"
        class="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-vibe-green! dark:text-vibe-mint!"
        ><span aria-hidden="true">←</span> Cài đặt</a
      >
      <h1 class="mt-5 text-[1.75rem] font-bold tracking-[-0.035em]">Dự án của bạn</h1>
      <p class="mt-2 text-sm leading-6 text-vibe-muted dark:text-vibe-sage">
        Một tên quen, một tín hiệu riêng. Dự án xuất hiện sau phiên làm việc đầu tiên.
      </p>
      @if (personal.projectState() === 'cached') {
        <p class="mt-4 text-sm">Đang xem danh sách đã lưu. Kết nối laptop để cập nhật.</p>
      }
      <div
        class="mt-6 divide-y divide-vibe-rule border-y border-vibe-rule dark:divide-vibe-rule-dark dark:border-vibe-rule-dark"
      >
        @for (profile of personal.profiles(); track profile.projectName) {
          <a
            [routerLink]="['/settings/projects', profile.projectName]"
            class="flex min-h-20 items-center justify-between gap-4 py-4 text-vibe-ink! dark:text-vibe-paper!"
          >
            <span class="min-w-0"
              ><span class="block text-base font-bold"
                ><app-project-identity [name]="profile.projectName"
              /></span>
              <span class="mt-1 block break-words text-xs text-vibe-muted dark:text-vibe-sage">{{
                profile.projectName
              }}</span></span
            ><span aria-hidden="true">→</span>
          </a>
        } @empty {
          <p class="py-5 text-sm leading-6 text-vibe-muted dark:text-vibe-sage">
            {{
              personal.projectState() === 'loading'
                ? 'Đang đọc dự án…'
                : personal.projectState() === 'unavailable'
                  ? 'Chưa đọc được dự án. Kiểm tra Tailscale rồi thử lại.'
                  : 'Chưa có dự án. Hãy bắt đầu một công việc trong Codex.'
            }}
          </p>
        }
      </div>
      <button
        class="mt-4 min-h-11 text-sm font-bold underline underline-offset-4"
        (click)="personal.loadProjects()"
      >
        Cập nhật danh sách
      </button>
    </main>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsPage {
  readonly personal = inject(PersonalStore);
  constructor() {
    void this.personal.loadProjects();
  }
}
