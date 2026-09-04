import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProjectEditorStore } from '../application/project-editor.store';
import { ProjectHistoryStore } from '../application/project-history.store';
import { ProjectIcon } from './project-icon';
import { WorkSessionCard } from '../../activity';
import { ToggleSwitch } from '../../../core/forms/ui/toggle-switch';

@Component({
  selector: 'app-project-page',
  imports: [RouterLink, ProjectIcon, WorkSessionCard, ToggleSwitch],
  providers: [ProjectEditorStore, ProjectHistoryStore],
  templateUrl: './project-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectPage {
  readonly editor = inject(ProjectEditorStore);
  readonly history = inject(ProjectHistoryStore);
  readonly now = new Date();
  readonly icons = [
    { value: 'cat', label: 'Mèo' },
    { value: 'heart', label: 'Nhịp tim' },
    { value: 'book', label: 'Lớp học' },
    { value: 'code', label: 'Mã nguồn' },
    { value: 'spark', label: 'Tia sáng' },
  ];
  readonly accents = [
    { value: 'mint', label: 'Xanh bạc hà' },
    { value: 'blue', label: 'Xanh dương' },
    { value: 'green', label: 'Xanh lá' },
    { value: 'amber', label: 'Hổ phách' },
    { value: 'coral', label: 'San hô' },
  ];
  readonly notifications = [
    { field: 'notifyCompletion' as const, label: 'Công việc hoàn tất' },
    { field: 'notifyPermission' as const, label: 'Codex đang chờ bạn' },
    { field: 'notifyFinalFailure' as const, label: 'Kiểm thử cuối chưa đạt' },
    { field: 'notifyPreview' as const, label: 'Bản xem trước sẵn sàng' },
  ];
  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const project = params.get('project') ?? '';
        void this.editor.open(project);
        void this.history.open(project);
      });
  }
}
