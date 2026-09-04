import { inject, Injectable, signal } from '@angular/core';
import { PersonalApi, type DailySummary } from '../data/personal-api';
import { PersonalCache, validSummary } from '../data/personal-cache';

export function localDay(now: Date): { from: string; to: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}
export function observedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? Math.floor(minutes / 60) + ' giờ ' + (minutes % 60) + ' phút'
    : minutes + ' phút';
}
@Injectable()
export class TodaySummaryStore {
  readonly #api = inject(PersonalApi);
  readonly #cache = inject(PersonalCache);
  readonly summary = signal<DailySummary | null>(null);
  readonly state = signal<'loading' | 'ready' | 'cached' | 'unavailable'>('loading');
  #last = 0;
  #day = '';
  #busy = false;
  async load(now = new Date()): Promise<void> {
    const day = localDay(now);
    if (this.#busy || (day.from === this.#day && Date.now() - this.#last < 30_000)) return;
    this.#busy = true;
    if (day.from !== this.#day) {
      this.summary.set(null);
      this.state.set('loading');
      this.#day = day.from;
    }
    try {
      if (!this.summary()) {
        const cached = (await this.#cache.read('today')) as {
          from?: string;
          summary?: unknown;
        } | null;
        if (cached?.from === day.from && validSummary(cached.summary)) {
          this.summary.set(cached.summary);
          this.state.set('cached');
        }
      }
      const summary = await this.#api.today(day.from, day.to);
      this.summary.set(summary);
      this.state.set('ready');
      await this.#cache.write('today', { from: day.from, summary });
    } catch {
      this.state.set(this.summary() ? 'cached' : 'unavailable');
    } finally {
      this.#busy = false;
      this.#last = Date.now();
    }
  }
}
