import { MotionSettings } from './motion-settings';
import { PersonalSettings } from '../../personal';
import { SegmentedControl } from '../../../core/forms/ui/segmented-control';
import { SignalMotion } from '../../../core/motion/signal-motion';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ToggleSwitch } from '../../../core/forms/ui/toggle-switch';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { PreferencesStore } from '../application/preferences.store';
import { NotificationPreviewStore } from '../application/notification-preview.store';
import { NotificationPrivacy } from './notification-privacy';

@Component({
  selector: 'app-settings-page',
  imports: [
    PersonalSettings,
    MotionSettings,
    SegmentedControl,
    SignalMotion,
    ToggleSwitch,
    PullToRefresh,
    NotificationPrivacy,
  ],
  templateUrl: './settings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  protected readonly preferences = inject(PreferencesStore);
  protected readonly notificationPreview = inject(NotificationPreviewStore);
  protected readonly themeOptions = [
    { value: 'system' as const, label: 'Theo iPhone' },
    { value: 'light' as const, label: 'Sáng' },
    { value: 'dark' as const, label: 'Tối' },
  ];

  protected readonly thresholds = [10, 15, 20, 25, 30].map((value) => ({
    value,
    label: value + '%',
  }));
  protected readonly retentionOptions = [7, 14, 30, 60, 90].map((value) => ({
    value,
    label: value + ' ngày',
  }));
  protected readonly numeric = Number;
  protected selectTheme(value: string | number): void {
    if (value === 'system' || value === 'light' || value === 'dark')
      this.preferences.setTheme(value);
  }

  ngOnInit(): void {
    void this.preferences.load();
    void this.notificationPreview.load();
  }

  protected setQuietTime(field: 'start' | 'end', event: Event): void {
    this.preferences.setQuietTime(field, inputValue(event));
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
