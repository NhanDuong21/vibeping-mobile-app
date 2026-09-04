import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, take, type Subscription } from 'rxjs';
import { ApiClient, type UsageLimitsSnapshotDto } from '../../../core/api/api-client';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';
import { UsageLimitsCache, isUsableUsageSnapshot, readTime } from '../data/usage-limits-cache';

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
  readonly #cache = inject(UsageLimitsCache);
  readonly #snapshot = signal<UsageLimitsSnapshotDto | null>(null);
  readonly #readerState = signal<ReaderState>('loading');
  readonly #refreshFailed = signal(false);
  #request?: Subscription;
  #stream?: EventSource;
  #started = false;
  #revision = 0;

  readonly snapshot = this.#snapshot.asReadonly();
  readonly readerState = this.#readerState.asReadonly();
  readonly refreshFailed = this.#refreshFailed.asReadonly();
  readonly windows = computed(() => this.#snapshot()?.windows ?? []);
  readonly state = computed(() => this.#snapshot()?.state ?? 'unavailable');
  readonly summary = computed(() => this.windows().slice(0, 2));

  start(): void {
    if (this.#started) return;
    this.#started = true;
    void this.restoreCached();
    this.#load();
    this.#stream = this.#eventSourceFactory('/api/v1/stream');
    this.#stream.addEventListener('allowance', (event) => this.receiveEvent(event));
    this.#stream.onerror = () => this.markDisconnected();
    this.#stream.onopen = () => this.#load();
    globalThis.addEventListener?.('online', this.#reconnect);
    globalThis.addEventListener?.('offline', this.#offline);
    globalThis.document?.addEventListener('visibilitychange', this.#foreground);
  }

  stop(): void {
    this.#revision++;
    this.#request?.unsubscribe();
    this.#stream?.close();
    this.#stream = undefined;
    this.#started = false;
    globalThis.removeEventListener?.('online', this.#reconnect);
    globalThis.removeEventListener?.('offline', this.#offline);
    globalThis.document?.removeEventListener('visibilitychange', this.#foreground);
  }

  async restoreCached(): Promise<void> {
    this.acceptCached(await this.#cache.read());
  }

  acceptCached(value: unknown): void {
    if (!isUsableUsageSnapshot(value)) return;
    const current = this.#snapshot();
    if (isUsableUsageSnapshot(current) && readTime(current) >= readTime(value)) return;
    this.#snapshot.set({ ...value, state: 'stale' });
    this.#readerState.set('ready');
  }

  acceptSnapshot(value: unknown): void {
    if (!isUsableUsageSnapshot(value)) {
      if (
        !this.windows().length &&
        value &&
        typeof value === 'object' &&
        (value as UsageLimitsSnapshotDto).state === 'noWindows'
      ) {
        this.#revision++;
        this.#snapshot.set({ state: 'noWindows', readAt: null, windows: [], cursor: '' });
        this.#readerState.set('ready');
        return;
      }
      this.markDisconnected();
      return;
    }
    const current = this.#snapshot();
    if (isUsableUsageSnapshot(current) && readTime(current) > readTime(value)) {
      this.#readerState.set('ready');
      return;
    }
    this.#revision++;
    this.#snapshot.set(value);
    this.#readerState.set('ready');
    this.#refreshFailed.set(false);
    void this.#cache.write(value);
  }

  markDisconnected(): void {
    this.#revision++;
    this.#snapshot.update((value) => (value ? { ...value, state: 'stale' } : null));
    this.#readerState.set(this.windows().length ? 'ready' : 'unavailable');
  }

  receiveEvent(raw: Event): void {
    if (raw instanceof MessageEvent) {
      try {
        this.acceptSnapshot(JSON.parse(String(raw.data)));
        return;
      } catch {
        /* Reconcile malformed events from the server. */
      }
    }
    this.#load();
  }

  lastReadLabel(): string {
    const readAt = this.#snapshot()?.readAt;
    return readAt ? formatRecordedTime(new Date(readAt)) : 'Chưa ghi nhận thời điểm đọc';
  }

  async refresh(): Promise<void> {
    if (this.#readerState() === 'refreshing') return;
    this.#readerState.set('refreshing');
    this.#refreshFailed.set(false);
    const revision = this.#revision;
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      const snapshot = await firstValueFrom(this.#api.refreshUsageLimits(pairing.csrfToken));
      this.acceptSnapshot(snapshot);
    } catch {
      if (revision !== this.#revision) return;
      this.markDisconnected();
      this.#refreshFailed.set(true);
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
    if (this.state() === 'stale') return `Mốc đặt lại đã lưu: ${formatRecordedTime(reset)}`;
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
    const revision = this.#revision;
    this.#request = this.#api
      .usageLimits()
      .pipe(take(1))
      .subscribe({
        next: (snapshot) => this.acceptSnapshot(snapshot),
        error: () => {
          if (revision === this.#revision) this.markDisconnected();
        },
      });
  }

  readonly #reconnect = (): void => this.#load();
  readonly #offline = (): void => this.markDisconnected();
  readonly #foreground = (): void => {
    if (globalThis.document?.visibilityState !== 'hidden') this.#load();
  };
}

function formatRecordedTime(value: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hourCycle: 'h23',
  }).format(value);
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
