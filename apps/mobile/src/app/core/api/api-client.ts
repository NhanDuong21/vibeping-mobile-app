import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { components } from '@vibeping/contracts';
import type { Observable } from 'rxjs';

export type BootstrapDto = components['schemas']['BootstrapResponse'];
export type PairingStatusDto = components['schemas']['PairingStatusResponse'];
export type PairingClaimDto = components['schemas']['PairingClaimRequest'];
export type PairingClaimResponseDto = components['schemas']['PairingClaimResponse'];
export type PublicKeyDto = components['schemas']['PublicKeyResponse'];
export type SubscriptionRegistrationDto = components['schemas']['SubscriptionRegistrationRequest'];
export type SubscriptionResponseDto = components['schemas']['SubscriptionResponse'];
export type TestPushResponseDto = components['schemas']['TestPushResponse'];
export type ActivitySnapshotDto = components['schemas']['ActivitySnapshot'];
export type ActivityEventDto = components['schemas']['ActivityEvent'];
export type ActivityEventDetailDto = components['schemas']['ActivityEventDetail'];
export type CurrentWorkDto = components['schemas']['CurrentWork'];
export type EventFeedDto = components['schemas']['EventFeed'];
export type ReadStateDto = components['schemas']['ReadStateResponse'];
export type UsageLimitsSnapshotDto = components['schemas']['UsageLimitsSnapshot'];
export type ComputerStatusDto = components['schemas']['ComputerStatus'];
export type PreferencesDto = components['schemas']['Preferences'];
export type DiagnosticsDto = components['schemas']['DiagnosticsReport'];
export type NotificationPreviewDto = components['schemas']['NotificationPreview'];
export type NotificationCopyDto = components['schemas']['NotificationCopy'];

@Injectable({ providedIn: 'root' })
export class ApiClient {
  readonly #http = inject(HttpClient);

  bootstrap(): Observable<BootstrapDto> {
    return this.#http.get<BootstrapDto>('/api/v1/bootstrap');
  }

  activity(): Observable<ActivitySnapshotDto> {
    return this.#http.get<ActivitySnapshotDto>('/api/v1/activity');
  }

  events(cursor?: string): Observable<EventFeedDto> {
    return this.#http.get<EventFeedDto>('/api/v1/events', {
      params: cursor ? { cursor, limit: 20, grouped: true } : { limit: 20, grouped: true },
    });
  }

  event(id: string): Observable<ActivityEventDetailDto> {
    return this.#http.get<ActivityEventDetailDto>(`/api/v1/events/${encodeURIComponent(id)}`);
  }

  markEventRead(id: string, csrfToken: string, through?: string): Observable<ReadStateDto> {
    return this.#http.post<ReadStateDto>(`/api/v1/events/${encodeURIComponent(id)}/read`, null, {
      ...mutationOptions(csrfToken),
      params: through ? { through } : {},
    });
  }

  markAllEventsRead(csrfToken: string): Observable<ReadStateDto> {
    return this.#http.post<ReadStateDto>(
      '/api/v1/events/read-all',
      null,
      mutationOptions(csrfToken),
    );
  }

  usageLimits(): Observable<UsageLimitsSnapshotDto> {
    return this.#http.get<UsageLimitsSnapshotDto>('/api/v1/usage-limits');
  }

  refreshUsageLimits(csrfToken: string): Observable<UsageLimitsSnapshotDto> {
    return this.#http.post<UsageLimitsSnapshotDto>(
      '/api/v1/usage-limits/refresh',
      null,
      mutationOptions(csrfToken),
    );
  }

  computerStatus(): Observable<ComputerStatusDto> {
    return this.#http.get<ComputerStatusDto>('/api/v1/computer/status');
  }

  preferences(): Observable<PreferencesDto> {
    return this.#http.get<PreferencesDto>('/api/v1/preferences');
  }

  notificationPreview(): Observable<NotificationPreviewDto> {
    return this.#http.get<NotificationPreviewDto>('/api/v1/notifications/preview');
  }

  savePreferences(request: PreferencesDto, csrfToken: string): Observable<PreferencesDto> {
    return this.#http.put<PreferencesDto>(
      '/api/v1/preferences',
      request,
      mutationOptions(csrfToken),
    );
  }

  diagnostics(): Observable<DiagnosticsDto> {
    return this.#http.get<DiagnosticsDto>('/api/v1/diagnostics');
  }

  runDiagnostics(csrfToken: string): Observable<DiagnosticsDto> {
    return this.#http.post<DiagnosticsDto>(
      '/api/v1/diagnostics/run',
      null,
      mutationOptions(csrfToken),
    );
  }

  pairingStatus(): Observable<PairingStatusDto> {
    return this.#http.get<PairingStatusDto>('/api/v1/pairing/status');
  }

  claimPairing(request: PairingClaimDto, csrfToken: string): Observable<PairingClaimResponseDto> {
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

  removeSubscription(id: string, csrfToken: string): Observable<{ state: string }> {
    return this.#http.delete<{ state: string }>(
      `/api/v1/push/subscriptions/${encodeURIComponent(id)}`,
      mutationOptions(csrfToken),
    );
  }

  testPush(installationId: string, csrfToken: string): Observable<TestPushResponseDto> {
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
