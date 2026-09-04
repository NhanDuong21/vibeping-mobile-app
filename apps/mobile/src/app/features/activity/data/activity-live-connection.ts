import { inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { EVENT_SOURCE_FACTORY } from '../../../core/connectivity/event-source';

type LiveEvent =
  | { type: 'reconcile' | 'disconnected' }
  | { type: 'activity' | 'work' | 'allowance'; event: Event };

const RECONCILE_MS = 15_000;
const SILENCE_MS = 45_000;

/** One foreground transport, with snapshots as recovery for missed stream messages. */
@Injectable({ providedIn: 'root' })
export class ActivityLiveConnection {
  readonly #factory = inject(EVENT_SOURCE_FACTORY);
  readonly #events = new Subject<LiveEvent>();
  readonly #connected = signal(false);
  readonly #visible = signal(document.visibilityState !== 'hidden');
  readonly #now = signal(new Date());
  #stream?: EventSource;
  #timer?: ReturnType<typeof setInterval>;
  #lastMessageAt = 0;

  readonly events = this.#events.asObservable();
  readonly connected = this.#connected.asReadonly();
  readonly visible = this.#visible.asReadonly();
  readonly now = this.#now.asReadonly();

  start(): void {
    if (this.#timer !== undefined) return;
    this.#timer = setInterval(() => this.#tick(), RECONCILE_MS);
    globalThis.addEventListener('online', this.#resume);
    globalThis.addEventListener('offline', this.#offline);
    document.addEventListener('visibilitychange', this.#visibilityChanged);
    this.#visible.set(document.visibilityState !== 'hidden');
    this.#now.set(new Date());
    if (this.#visible() && navigator.onLine !== false) this.#connect();
  }

  stop(): void {
    clearInterval(this.#timer);
    this.#timer = undefined;
    this.#close();
    globalThis.removeEventListener('online', this.#resume);
    globalThis.removeEventListener('offline', this.#offline);
    document.removeEventListener('visibilitychange', this.#visibilityChanged);
  }

  readonly #resume = (): void => {
    this.#now.set(new Date());
    this.#visible.set(document.visibilityState !== 'hidden');
    if (!this.#visible() || navigator.onLine === false) return;
    this.#connect();
    this.#events.next({ type: 'reconcile' });
  };

  readonly #offline = (): void => {
    this.#close();
    this.#events.next({ type: 'disconnected' });
  };

  readonly #visibilityChanged = (): void => {
    this.#visible.set(document.visibilityState !== 'hidden');
    if (this.#visible()) this.#resume();
    else this.#close();
  };

  #tick(): void {
    this.#now.set(new Date());
    if (!this.#visible() || navigator.onLine === false) return;
    if (
      !this.#stream ||
      this.#stream.readyState === 2 ||
      Date.now() - this.#lastMessageAt >= SILENCE_MS
    )
      this.#connect();
    this.#events.next({ type: 'reconcile' });
  }

  #connect(): void {
    this.#close();
    const stream = this.#factory('/api/v1/stream');
    this.#stream = stream;
    this.#lastMessageAt = Date.now();
    stream.onopen = () => {
      if (this.#stream !== stream) return;
      this.#lastMessageAt = Date.now();
      this.#connected.set(true);
    };
    const listen = (type: string, receive: (event: Event) => void): void => {
      stream.addEventListener(type, (event) => {
        if (this.#stream !== stream) return;
        this.#lastMessageAt = Date.now();
        this.#connected.set(true);
        receive(event);
      });
    };
    listen('connected', () => this.#events.next({ type: 'reconcile' }));
    listen('heartbeat', () => undefined);
    for (const type of ['activity', 'work', 'allowance'] as const)
      listen(type, (event) => this.#events.next({ type, event }));
    stream.onerror = () => {
      if (this.#stream !== stream) return;
      this.#connected.set(false);
      this.#events.next({ type: 'disconnected' });
    };
  }

  #close(): void {
    const previous = this.#stream;
    this.#stream = undefined;
    previous?.close();
    this.#connected.set(false);
  }
}
