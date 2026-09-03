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

  ngOnInit(): void {
    void this.preferences.load();
  }

  protected setThreshold(event: Event): void {
    this.preferences.setAllowanceThreshold(Number(inputValue(event)));
  }

  protected setQuietTime(field: 'start' | 'end', event: Event): void {
    this.preferences.setQuietTime(field, inputValue(event));
  }

  protected setRetention(event: Event): void {
    this.preferences.setRetentionDays(Number(inputValue(event)));
  }
}

function inputValue(event: Event): string {
  return (event.currentTarget as HTMLInputElement).value;
}
