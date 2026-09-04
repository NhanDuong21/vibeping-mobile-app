import { inject, Injectable, signal } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { type Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UpdateStore {
  readonly #updates = inject(SwUpdate);
  readonly #available = signal(false);
  readonly #installing = signal(false);
  readonly #version = signal<string | null>(null);
  #subscription?: Subscription;
  #checkTimer?: ReturnType<typeof setInterval>;
  #checking = false;

  readonly available = this.#available.asReadonly();
  readonly installing = this.#installing.asReadonly();
  readonly version = this.#version.asReadonly();

  start(): void {
    if (!this.#updates.isEnabled || this.#subscription) return;
    this.#subscription = this.#updates.versionUpdates.subscribe((event: VersionEvent) => {
      if (event.type !== 'VERSION_READY') return;
      const data = event.latestVersion.appData as { version?: unknown } | undefined;
      const version = data?.version;
      this.#version.set(
        typeof version === 'string' && /^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(version) ? version : null,
      );
      this.#available.set(true);
    });
    void this.#check();
    this.#checkTimer = setInterval(() => void this.#check(), 60_000);
    globalThis.document?.addEventListener('visibilitychange', this.#foreground);
    globalThis.addEventListener?.('online', this.#foreground);
  }

  stop(): void {
    this.#subscription?.unsubscribe();
    this.#subscription = undefined;
    clearInterval(this.#checkTimer);
    globalThis.document?.removeEventListener('visibilitychange', this.#foreground);
    globalThis.removeEventListener?.('online', this.#foreground);
  }

  readonly #foreground = (): void => {
    if (globalThis.document?.visibilityState !== 'hidden') void this.#check();
  };

  async #check(): Promise<void> {
    if (this.#checking || this.#available() || globalThis.document?.visibilityState === 'hidden')
      return;
    this.#checking = true;
    try {
      await this.#updates.checkForUpdate();
    } catch {
      // Offline checks are retried on foreground, reconnect, or the next interval.
    } finally {
      this.#checking = false;
    }
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
