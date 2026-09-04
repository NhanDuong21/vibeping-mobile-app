import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { components } from '@vibeping/contracts';
import { firstValueFrom, timeout, type Observable } from 'rxjs';
import { ApiClient, type EventFeedDto } from '../../../core/api/api-client';

export type ProjectProfile = components['schemas']['ProjectProfile'];
export type PersonalRules = components['schemas']['PersonalRules'];
export type DailySummary = components['schemas']['DailySummary'];
export type ReadyStatus = components['schemas']['ReadyStatus'];

@Injectable({ providedIn: 'root' })
export class PersonalApi {
  readonly #http = inject(HttpClient);
  readonly #api = inject(ApiClient);
  projects() {
    return bounded(this.#http.get<ProjectProfile[]>('/api/v1/personal/projects'));
  }
  rules() {
    return bounded(this.#http.get<PersonalRules>('/api/v1/personal/rules'));
  }
  ready() {
    return bounded(this.#http.get<ReadyStatus>('/api/v1/always-ready'));
  }
  today(from: string, to: string) {
    return bounded(
      this.#http.get<DailySummary>('/api/v1/personal/today', { params: { from, to } }),
    );
  }
  history(project: string, cursor?: string) {
    return bounded(
      this.#http.get<EventFeedDto>('/api/v1/events', {
        params: { project, grouped: true, limit: 20, ...(cursor ? { cursor } : {}) },
      }),
    );
  }
  async saveProject(value: ProjectProfile) {
    return this.#save('/api/v1/personal/projects', value);
  }
  async saveRules(value: PersonalRules) {
    return this.#save('/api/v1/personal/rules', value);
  }
  async #save<T>(url: string, value: T): Promise<T> {
    const pairing = await bounded(this.#api.pairingStatus());
    return bounded(
      this.#http.put<T>(url, value, {
        headers: new HttpHeaders({ 'X-VibePing-CSRF': pairing.csrfToken }),
      }),
    );
  }
}

function bounded<T>(value: Observable<T>): Promise<T> {
  return firstValueFrom(value.pipe(timeout({ first: 8_000 })));
}
