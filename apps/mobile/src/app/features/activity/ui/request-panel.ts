import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { ActivityEventDto } from '../../../core/api/api-client';
import { clock, exactDateTime } from '../../../core/formatting/time';
import { ActivityStore } from '../application/activity.store';
import { RequestDetailStore } from '../application/request-detail.store';
import { resultPreview } from '../application/thread-presentation';
import { sessionIsWorking, sessionStatus } from '../application/work-session-presentation';
import { RequestContent } from './request-content';
import { SessionWorkingSignal } from './session-working-signal';

@Component({
  selector: 'app-request-panel',
  imports: [RequestContent, SessionWorkingSignal],
  providers: [RequestDetailStore],
  templateUrl: './request-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestPanel {
  readonly event = input.required<ActivityEventDto>();
  readonly latest = input(false);
  readonly single = input(false);
  readonly targeted = input(false);
  readonly #choice = signal<boolean | null>(null);
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  protected readonly detail = inject(RequestDetailStore);
  protected readonly activity = inject(ActivityStore);
  protected readonly open = computed(
    () => this.single() || (this.#choice() ?? (this.latest() || this.targeted())),
  );
  protected readonly label = computed(() =>
    this.latest() ? 'Yêu cầu gần nhất' : 'Yêu cầu trước đó',
  );
  protected readonly working = computed(() =>
    sessionIsWorking(this.event(), this.activity.now(), this.activity.isStale()),
  );
  protected readonly status = sessionStatus;
  protected readonly preview = resultPreview;
  protected readonly clock = clock;
  protected readonly exactTime = exactDateTime;
  constructor() {
    effect(() => {
      const id = this.event().id;
      if (this.open()) untracked(() => this.detail.open(id));
      else untracked(() => this.detail.close());
    });
    effect(() => {
      if (this.targeted())
        afterNextRender(
          () => {
            this.#element.nativeElement.scrollIntoView({ block: 'start', behavior: 'instant' });
          },
          { injector: this.#injector },
        );
    });
  }
  protected toggle(): void {
    this.#choice.set(!this.open());
  }
}
