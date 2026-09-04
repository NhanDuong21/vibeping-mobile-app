import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { PersonalApi, type ReadyStatus } from '../data/personal-api';

@Injectable()
export class WindowsReadinessStore {
  readonly #api = inject(PersonalApi);
  readonly status = signal<ReadyStatus | null>(null);
  readonly state = signal<'loading' | 'ready' | 'stale' | 'unavailable'>('loading');
  #checking = false;
  readonly lastCheck = computed(() => {
    const timestamp = this.status()?.checkedAt;
    if (!timestamp || this.state() === 'ready') return null;
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return null;
    return (
      'Lần kiểm tra trước: ' +
      date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  });
  readonly label = computed(() => {
    if (this.state() === 'loading') return 'Đang kiểm tra…';
    if (this.state() === 'stale') return 'Cần kiểm tra lại laptop';
    if (this.state() === 'unavailable') return 'Chưa kiểm tra được laptop';
    const status = this.status();
    if (!status) return 'Đang kiểm tra…';
    if (!status.enabled) return 'Chưa bật Sẵn sàng';
    if (!status.trayAvailable) return 'Cần kiểm tra khay trên laptop';
    switch (status.state) {
      case 'healthy':
        return 'Laptop đang sẵn sàng';
      case 'stopped':
        return 'Bạn đã dừng VibePing';
      case 'recovering':
        return 'Đang khôi phục kết nối';
      default:
        return 'Cần kiểm tra trên laptop';
    }
  });
  constructor() {
    const foreground = (): void => {
      if (document.visibilityState === 'hidden') this.state.set('stale');
      else void this.load();
    };
    const timer = setInterval(foreground, 30_000);
    document.addEventListener('visibilitychange', foreground);
    globalThis.addEventListener('pageshow', foreground);
    globalThis.addEventListener('online', foreground);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', foreground);
      globalThis.removeEventListener('pageshow', foreground);
      globalThis.removeEventListener('online', foreground);
    });
  }
  async load(): Promise<void> {
    if (this.#checking) return;
    this.#checking = true;
    this.state.set('loading');
    try {
      const status = await this.#api.ready();
      this.status.set(status);
      const age = Date.now() - Date.parse(status.checkedAt ?? '');
      this.state.set(
        document.visibilityState === 'hidden' ||
          (status.enabled && (!Number.isFinite(age) || age > 75_000))
          ? 'stale'
          : 'ready',
      );
    } catch {
      this.state.set('unavailable');
    } finally {
      this.#checking = false;
    }
  }
}
