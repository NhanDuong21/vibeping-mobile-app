import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { components } from '@vibeping/contracts';
import type { Observable } from 'rxjs';

export type BootstrapDto = components['schemas']['BootstrapResponse'];

@Injectable({ providedIn: 'root' })
export class ApiClient {
  readonly #http = inject(HttpClient);

  bootstrap(): Observable<BootstrapDto> {
    return this.#http.get<BootstrapDto>('/api/v1/bootstrap');
  }
}
