import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient, type DiagnosticsDto } from '../../../core/api/api-client';

type DiagnosticState = 'loading' | 'ready' | 'unavailable';
type CopyState = 'idle' | 'copied' | 'failed';

@Injectable({ providedIn: 'root' })
export class DiagnosticsStore {
  readonly #api = inject(ApiClient);
  readonly #state = signal<DiagnosticState>('loading');
  readonly #report = signal<DiagnosticsDto | null>(null);
  readonly #running = signal(false);
  readonly #copyState = signal<CopyState>('idle');

  readonly state = this.#state.asReadonly();
  readonly report = this.#report.asReadonly();
  readonly running = this.#running.asReadonly();
  readonly copyState = this.#copyState.asReadonly();

  async load(): Promise<void> {
    try {
      this.#report.set(await firstValueFrom(this.#api.diagnostics()));
      this.#state.set('ready');
    } catch {
      this.#state.set('unavailable');
    }
  }

  async run(): Promise<void> {
    if (this.#running()) return;
    this.#running.set(true);
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      this.#report.set(await firstValueFrom(this.#api.runDiagnostics(pairing.csrfToken)));
      this.#state.set('ready');
    } catch {
      this.#state.set('unavailable');
    } finally {
      this.#running.set(false);
    }
  }

  async copy(): Promise<void> {
    const report = this.#report()?.technicalReport;
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      this.#copyState.set('copied');
    } catch {
      this.#copyState.set('failed');
    }
  }
}
