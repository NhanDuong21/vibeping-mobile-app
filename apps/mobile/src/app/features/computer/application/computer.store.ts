import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient, type ComputerStatusDto } from '../../../core/api/api-client';
import { relativeSignalTime } from '../../../core/formatting/time';
import { installationId } from '../../../core/notifications/registration';

type ComputerState = 'loading' | 'ready' | 'unavailable';
type TestState = 'idle' | 'countdown' | 'sent' | 'queued' | 'failed';

@Injectable({ providedIn: 'root' })
export class ComputerStore {
  readonly #api = inject(ApiClient);
  readonly #state = signal<ComputerState>('loading');
  readonly #status = signal<ComputerStatusDto | null>(null);
  readonly #testState = signal<TestState>('idle');

  readonly state = this.#state.asReadonly();
  readonly status = this.#status.asReadonly();
  readonly testState = this.#testState.asReadonly();

  async load(): Promise<void> {
    this.#state.set('loading');
    try {
      this.#status.set(await firstValueFrom(this.#api.computerStatus()));
      this.#state.set('ready');
    } catch {
      this.#state.set('unavailable');
    }
  }

  async sendDelayedTest(): Promise<void> {
    if (this.#testState() === 'countdown') return;
    this.#testState.set('countdown');
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      const result = await firstValueFrom(this.#api.testPush(installationId(), pairing.csrfToken));
      this.#testState.set(result.state === 'providerAccepted' ? 'sent' : 'queued');
    } catch {
      this.#testState.set('failed');
    }
  }

  lastSignalLabel(now = new Date()): string {
    const value = this.#status()?.lastSignalAt;
    if (!value) return 'Chưa có tín hiệu';
    return relativeSignalTime(value, now);
  }
}
