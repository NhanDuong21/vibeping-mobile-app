import { computed, inject, Injectable, signal } from '@angular/core';
import { PersonalStore } from './personal.store';
import type { ProjectProfile } from '../data/personal-api';
import { validProfile } from '../data/personal-cache';

@Injectable()
export class ProjectEditorStore {
  readonly personal = inject(PersonalStore);
  readonly draft = signal<ProjectProfile | null>(null);
  readonly state = signal<'loading' | 'ready' | 'missing'>('loading');
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  readonly saveMessage = computed(() =>
    this.saveState() === 'saved'
      ? 'Đã lưu hồ sơ dự án.'
      : this.saveState() === 'failed'
        ? 'Chưa lưu được. Dùng tên ngắn, không có đường dẫn; kiểm tra kết nối rồi thử lại.'
        : '',
  );
  readonly missingMessage = computed(() =>
    this.state() === 'loading'
      ? 'Đang đọc hồ sơ…'
      : 'Chưa tìm thấy dự án. Quay lại danh sách để cập nhật.',
  );
  readonly valid = computed(
    () => validProfile(this.draft()) && [...(this.draft()?.displayName.trim() ?? '')].length <= 60,
  );
  #revision = 0;
  async open(project: string): Promise<void> {
    const revision = ++this.#revision;
    this.state.set('loading');
    this.draft.set(null);
    await this.personal.loadProjects();
    if (revision !== this.#revision) return;
    this.draft.set(this.personal.profile(project) ?? null);
    this.state.set(this.draft() ? 'ready' : 'missing');
  }
  update(patch: Partial<ProjectProfile>): void {
    if (this.saveState() === 'saving') return;
    this.draft.update((v) => (v ? { ...v, ...patch } : null));
    this.saveState.set('idle');
  }
  text(field: 'displayName' | 'icon' | 'accent', value: string): void {
    this.update({ [field]: value });
  }
  threshold(field: 'completionMinMinutes' | 'waitingReminderMinutes', value: string): void {
    this.update({ [field]: value === '' ? null : Number(value) });
  }
  toggle(
    field: 'notifyCompletion' | 'notifyPermission' | 'notifyPreview' | 'notifyFinalFailure',
  ): void {
    const value = this.draft();
    if (value) this.update({ [field]: !value[field] });
  }
  async save(): Promise<void> {
    const value = this.draft();
    if (!value || !this.valid() || this.saveState() === 'saving') return;
    this.saveState.set('saving');
    const revision = this.#revision;
    try {
      const saved = await this.personal.saveProfile(value);
      if (revision === this.#revision) {
        this.draft.set(saved);
        this.saveState.set('saved');
      }
    } catch {
      if (revision === this.#revision) this.saveState.set('failed');
    }
  }
}
