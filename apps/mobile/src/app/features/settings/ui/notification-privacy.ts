import { SegmentedControl } from '../../../core/forms/ui/segmented-control';
import { MotionPreferenceStore } from '../../../core/motion/motion-preference.store';
import { inject } from '@angular/core';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnChanges,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { NotificationCopyDto, NotificationPreviewDto } from '../../../core/api/api-client';

type PrivacyMode = 'private' | 'project' | 'standard';
const privacyRank = { private: 0, project: 1, standard: 2 };

@Component({
  selector: 'app-notification-privacy',
  imports: [SegmentedControl],
  templateUrl: './notification-privacy.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPrivacy implements OnChanges {
  readonly #motion = inject(MotionPreferenceStore);
  readonly mode = input.required<string>();
  readonly preview = input<NotificationPreviewDto | null>(null);
  readonly state = input<'loading' | 'ready' | 'unavailable'>('loading');
  readonly changed = output<PrivacyMode>();
  readonly retry = output<void>();
  protected readonly current = signal<NotificationCopyDto | null>(null);
  protected readonly previous = signal<NotificationCopyDto | null>(null);
  protected readonly options = [
    { value: 'private' as const, label: 'Chỉ báo' },
    { value: 'project' as const, label: 'Tên dự án' },
    { value: 'standard' as const, label: 'Hiện tóm tắt' },
  ];
  private readonly currentText = viewChild<ElementRef<HTMLElement>>('currentText');
  private readonly previousText = viewChild<ElementRef<HTMLElement>>('previousText');
  #lastMode: PrivacyMode = 'private';

  constructor() {
    afterRenderEffect((cleanup) => {
      const current = this.currentText()?.nativeElement;
      const previous = this.previousText()?.nativeElement;
      this.current();
      if (!current || !this.#motion.enabled()) {
        this.previous.set(null);
        return;
      }
      const options = { duration: 160, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
      const incoming = current.animate?.([{ opacity: 0.35 }, { opacity: 1 }], options);
      const outgoing = previous?.animate?.([{ opacity: 1 }, { opacity: 0 }], {
        ...options,
        fill: 'forwards',
      });
      if (outgoing) outgoing.onfinish = () => this.previous.set(null);
      cleanup(() => {
        incoming?.cancel();
        outgoing?.cancel();
      });
    });
  }

  protected select(value: string | number): void {
    this.changed.emit(value as PrivacyMode);
  }

  ngOnChanges(): void {
    const mode =
      this.mode() === 'standard' || this.mode() === 'project'
        ? (this.mode() as PrivacyMode)
        : 'private';
    const next = this.preview()?.[mode] ?? null;
    if (next === this.current()) return;
    const reducedMotion = !this.#motion.enabled();
    // Restricting privacy removes the old details immediately, even during rapid changes.
    this.previous.set(
      !reducedMotion && privacyRank[mode] > privacyRank[this.#lastMode] ? this.current() : null,
    );
    this.current.set(next);
    this.#lastMode = mode;
  }
}
