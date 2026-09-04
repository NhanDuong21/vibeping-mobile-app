import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivityCache } from '../../activity';
import type { ActivityEventDto } from '../../../core/api/api-client';
import { PersonalApi } from '../data/personal-api';

@Injectable()
export class ProjectHistoryStore {
  readonly #api = inject(PersonalApi);
  readonly #cache = inject(ActivityCache);
  readonly events = signal<ActivityEventDto[]>([]);
  readonly state = signal<'loading' | 'ready' | 'cached' | 'unavailable'>('loading');
  readonly next = signal<string | null>(null);
  readonly loadingMore = signal(false);
  readonly failedMore = signal(false);
  readonly emptyMessage = computed(() =>
    this.state() === 'loading'
      ? 'Đang đọc các phiên…'
      : this.state() === 'unavailable'
        ? 'Chưa đọc được lịch sử. Kiểm tra kết nối rồi thử lại.'
        : 'Chưa có phiên trong thời gian lưu lịch sử.',
  );
  #project = '';
  #revision = 0;
  async open(project: string): Promise<void> {
    const revision = ++this.#revision;
    this.#project = project;
    this.state.set('loading');
    this.events.set([]);
    this.next.set(null);
    this.failedMore.set(false);
    this.loadingMore.set(false);
    try {
      const feed = await this.#api.history(project);
      if (revision !== this.#revision) return;
      this.events.set(feed.events);
      this.next.set(feed.nextCursor ?? null);
      this.state.set('ready');
    } catch {
      const cached = await this.#cache.read();
      if (revision !== this.#revision) return;
      const events = (cached?.events ?? []).filter((e) => e.projectName === project);
      this.events.set(events);
      this.state.set(events.length ? 'cached' : 'unavailable');
    }
  }
  async more(): Promise<void> {
    const cursor = this.next();
    const revision = this.#revision;
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.failedMore.set(false);
    try {
      const feed = await this.#api.history(this.#project, cursor);
      if (revision !== this.#revision) return;
      this.events.update((old) => [
        ...old,
        ...feed.events.filter((e) => !old.some((v) => v.id === e.id)),
      ]);
      this.next.set(feed.nextCursor ?? null);
    } catch {
      if (revision === this.#revision) this.failedMore.set(true);
    } finally {
      if (revision === this.#revision) this.loadingMore.set(false);
    }
  }
}
