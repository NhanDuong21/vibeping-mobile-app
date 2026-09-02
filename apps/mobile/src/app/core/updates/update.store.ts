import { inject, Injectable, signal } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { filter, type Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UpdateStore {
  readonly #updates = inject(SwUpdate);
  readonly #available = signal(false);
  readonly #installing = signal(false);
  #subscription?: Subscription;

  readonly available = this.#available.asReadonly();
  readonly installing = this.#installing.asReadonly();

  start(): void {
    if (!this.#updates.isEnabled || this.#subscription) return;
    this.#subscription = this.#updates.versionUpdates
      .pipe(filter((event: VersionEvent) => event.type === 'VERSION_READY'))
      .subscribe(() => this.#available.set(true));
  }

  stop(): void {
    this.#subscription?.unsubscribe();
    this.#subscription = undefined;
  }

  async install(): Promise<void> {
    if (this.#installing()) return;
    this.#installing.set(true);
    try {
      await this.#updates.activateUpdate();
      globalThis.location?.reload();
    } catch {
      this.#installing.set(false);
    }
  }
}
