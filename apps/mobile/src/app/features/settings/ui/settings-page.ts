import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { BottomNavigation } from '../../../core/navigation/ui/bottom-navigation';
import { ToggleSwitch } from '../../../core/forms/ui/toggle-switch';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { PreferencesStore } from '../application/preferences.store';

@Component({
  selector: 'app-settings-page',
  imports: [BottomNavigation, ToggleSwitch, PullToRefresh],
  templateUrl: './settings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  protected readonly preferences = inject(PreferencesStore);
  protected readonly themeOptions = [
    { value: 'system' as const, label: 'Theo iPhone' },
    { value: 'light' as const, label: 'Sáng' },
    { value: 'dark' as const, label: 'Tối' },
  ];

  ngOnInit(): void {
    void this.preferences.load();
  }

  protected setQuietTime(field: 'start' | 'end', event: Event): void {
    this.preferences.setQuietTime(field, inputValue(event));
  }

  protected previewLine(mode: string): string {
    if (mode === 'private') return 'Có tín hiệu mới.';
    return 'Công việc đã hoàn tất · vibeping-mobile-app';
  }

  protected notificationStatus(): string {
    const labels = {
      loading: 'Đang kiểm tra',
      healthy: 'Đang hoạt động',
      stale: 'Điện thoại cần bật lại thông báo',
      denied: 'Thông báo đang bị tắt trên iPhone',
      unsupported: 'Cần mở từ Màn hình chính',
    };
    return labels[this.preferences.notificationHealth()];
  }
}

function inputValue(event: Event): string {
  return (event.currentTarget as HTMLInputElement).value;
}
