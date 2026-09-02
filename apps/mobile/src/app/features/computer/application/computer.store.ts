import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient, type ComputerStatusDto } from '../../../core/api/api-client';
import { installationId } from '../../../core/notifications/registration';

type ComputerState = 'loading' | 'ready' | 'unavailable';
type TestState = 'idle' | 'sending' | 'accepted' | 'failed';

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
    if (this.#testState() === 'sending') return;
    this.#testState.set('sending');
    try {
      const pairing = await firstValueFrom(this.#api.pairingStatus());
      const result = await firstValueFrom(
        this.#api.testPush(installationId(), pairing.csrfToken),
      );
      this.#testState.set(
        result.state === 'providerAccepted' ? 'accepted' : 'failed',
      );
    } catch {
      this.#testState.set('failed');
    }
  }

  lastSignalLabel(): string {
    const value = this.#status()?.lastSignalAt;
    if (!value) return 'Chưa có tín hiệu';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
