import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, take, type Subscription } from 'rxjs';
import { ApiClient, type UsageLimitsSnapshotDto } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';

type UsageWindow = UsageLimitsSnapshotDto['windows'][number];
type ReaderState = 'loading' | 'ready' | 'refreshing' | 'unavailable';

const DAY_IN_MILLISECONDS = 86_400_000;
const WEEKDAY_LABELS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

@Injectable({ providedIn: 'root' })
export class UsageLimitsStore {
  readonly #api = inject(ApiClient);
  readonly #eventSourceFactory = inject(EVENT_SOURCE_FACTORY);
  readonly #snapshot = signal<UsageLimitsSnapshotDto | null>(null);
  readonly #readerState = signal<ReaderState>('loading');
  readonly #refreshFailed = signal(false);
  #request?: Subscription;
  #stream?: EventSource;
  #started = false;

  readonly snapshot = this.#snapshot.asReadonly();
  readonly readerState = this.#readerState.asReadonly();
  readonly refreshFailed = this.#refreshFailed.asReadonly();
  readonly windows = computed(() => this.#snapshot()?.windows ?? []);
  readonly state = computed(() => this.#snapshot()?.state ?? 'unavailable');
  readonly summary = computed(() => this.windows().slice(0, 2));

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#load();
    this.#stream = this.#eventSourceFactory('/api/v1/stream');
    this.#stream.addEventListener('allowance', () => this.#load());
  }

  stop(): void {
    this.#request?.unsubscribe();
    this.#stream?.close();
    this.#stream = undefined;
    this.#started = false;
  }

  async refresh(): Promise<void> {
    if (this.#readerState() === 'refreshing') return;
    this.#readerState.set('refreshing');
    this.#refreshFailed.set(false);
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      const snapshot = await firstValueFrom(this.#api.refreshUsageLimits(pairing.csrfToken));
      this.#snapshot.set(snapshot);
      this.#readerState.set('ready');
    } catch {
      this.#refreshFailed.set(true);
      this.#readerState.set(this.#snapshot() ? 'ready' : 'unavailable');
    }
  }

  statusLabel(window: UsageWindow): string {
    if (window.reached || window.remainingPercent <= 0) return 'Đã hết';
    if (window.remainingPercent <= 5) return 'Gần hết';
    if (window.remainingPercent <= 20) return 'Sắp thấp';
    return 'Còn tốt';
  }

  percentLabel(window: UsageWindow): string {
    return `${Math.round(window.remainingPercent)}%`;
  }

  resetLabel(window: UsageWindow, now = new Date()): string {
    const reset = new Date(window.resetsAt * 1000);
    const minutes = Math.max(0, Math.round((reset.getTime() - now.getTime()) / 60_000));
    if (minutes < 60) return `Đặt lại sau ${minutes} phút`;
    if (minutes < 24 * 60) return `Đặt lại sau ${Math.round(minutes / 60)} giờ`;
    const weekday = WEEKDAY_LABELS[reset.getDay()];
    const weekContext = isNextCalendarWeek(reset, now) ? ' tuần sau' : '';
    const time = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(reset);
    const date = formatCalendarDate(reset, now);
    return `Đặt lại ${weekday}${weekContext}, ${time} · ${date}`;
  }

  #load(): void {
    this.#request?.unsubscribe();
    this.#request = this.#api
      .usageLimits()
      .pipe(take(1))
      .subscribe({
        next: (snapshot) => {
          this.#snapshot.set(snapshot);
          this.#refreshFailed.set(false);
          this.#readerState.set('ready');
        },
        error: () => this.#readerState.set('unavailable'),
      });
  }
}

function isNextCalendarWeek(value: Date, now: Date): boolean {
  return localWeekStart(value) - localWeekStart(now) === 7 * DAY_IN_MILLISECONDS;
}

function localWeekStart(value: Date): number {
  const daysSinceMonday = (value.getDay() + 6) % 7;
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate() - daysSinceMonday);
}

function formatCalendarDate(value: Date, now: Date): string {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear() === now.getFullYear() ? '' : `/${value.getFullYear()}`;
  return `${day}/${month}${year}`;
}
