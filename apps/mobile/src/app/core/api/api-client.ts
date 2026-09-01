import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { components } from '@vibeping/contracts';
import type { Observable } from 'rxjs';

export type BootstrapDto = components['schemas']['BootstrapResponse'];
export type PairingStatusDto = components['schemas']['PairingStatusResponse'];
export type PairingClaimDto = components['schemas']['PairingClaimRequest'];
export type PairingClaimResponseDto = components['schemas']['PairingClaimResponse'];
export type PublicKeyDto = components['schemas']['PublicKeyResponse'];
export type SubscriptionRegistrationDto =
  components['schemas']['SubscriptionRegistrationRequest'];
export type SubscriptionResponseDto =
  components['schemas']['SubscriptionResponse'];
export type TestPushResponseDto = components['schemas']['TestPushResponse'];

@Injectable({ providedIn: 'root' })
export class ApiClient {
  readonly #http = inject(HttpClient);

  bootstrap(): Observable<BootstrapDto> {
    return this.#http.get<BootstrapDto>('/api/v1/bootstrap');
  }

  pairingStatus(): Observable<PairingStatusDto> {
    return this.#http.get<PairingStatusDto>('/api/v1/pairing/status');
  }

  claimPairing(
    request: PairingClaimDto,
    csrfToken: string,
  ): Observable<PairingClaimResponseDto> {
    return this.#http.post<PairingClaimResponseDto>(
      '/api/v1/pairing/claim',
      request,
      mutationOptions(csrfToken),
    );
  }

  pushPublicKey(): Observable<PublicKeyDto> {
    return this.#http.get<PublicKeyDto>('/api/v1/push/public-key');
  }

  saveSubscription(
    request: SubscriptionRegistrationDto,
    csrfToken: string,
  ): Observable<SubscriptionResponseDto> {
    return this.#http.post<SubscriptionResponseDto>(
      '/api/v1/push/subscriptions',
      request,
      mutationOptions(csrfToken),
    );
  }

  testPush(
    installationId: string,
    csrfToken: string,
  ): Observable<TestPushResponseDto> {
    return this.#http.post<TestPushResponseDto>(
      '/api/v1/push/test',
      { installationId },
      mutationOptions(csrfToken),
    );
  }
}

function mutationOptions(csrfToken: string): { headers: HttpHeaders } {
  return {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'X-VibePing-CSRF': csrfToken,
    }),
  };
}
