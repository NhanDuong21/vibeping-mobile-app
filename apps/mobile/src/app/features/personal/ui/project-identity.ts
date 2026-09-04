import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PersonalStore } from '../application/personal.store';
import { ProjectIcon } from './project-icon';

@Component({
  selector: 'app-project-identity',
  imports: [ProjectIcon],
  template: `<span class="inline-flex max-w-full items-center gap-1.5 align-middle">
    @if (profile(); as p) {
      <app-project-icon [icon]="p.icon" [accent]="p.accent" />
    }
    <span class="min-w-0 break-words">{{ profile()?.displayName || name() }}</span>
  </span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectIdentity {
  readonly name = input.required<string>();
  readonly #personal = inject(PersonalStore);
  readonly profile = computed(() => this.#personal.profile(this.name()));
  constructor() {
    this.#personal.ensureProjects();
  }
}
