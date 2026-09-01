import { InjectionToken } from '@angular/core';

export type EventSourceFactory = (url: string) => EventSource;

export const EVENT_SOURCE_FACTORY = new InjectionToken<EventSourceFactory>(
  'EVENT_SOURCE_FACTORY',
  { factory: () => (url) => new EventSource(url) },
);
