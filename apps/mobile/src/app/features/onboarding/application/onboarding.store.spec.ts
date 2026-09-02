import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { of, Subject } from 'rxjs';
import { ApiClient, type TestPushResponseDto } from '../../../core/api/api-client';
import { onboardingCompleted } from '../data/onboarding-completion';
import { OnboardingStore } from './onboarding.store';

describe('OnboardingStore', () => {
  beforeEach(() => localStorage.clear());

  it('completes setup when the user sends the one-time test', async () => {
    const response = new Subject<TestPushResponseDto>();
    const api = {
      pairingStatus: vi.fn().mockReturnValue(
        of({
          state: 'paired',
          ownerMatch: true,
          privateIdentityReady: true,
          codeExpiresAt: null,
          csrfToken: 'test-csrf',
        }),
      ),
      pushPublicKey: vi.fn().mockReturnValue(of({ publicKey: 'test-public-key' })),
      testPush: vi.fn().mockReturnValue(response),
    };
    TestBed.configureTestingModule({
      providers: [
        OnboardingStore,
        { provide: ApiClient, useValue: api },
        { provide: SwPush, useValue: { isEnabled: true, subscription: of(null) } },
      ],
    });
    const store = TestBed.inject(OnboardingStore);

    await store.start();
    expect(onboardingCompleted()).toBe(false);

    const sending = store.sendTest();

    expect(onboardingCompleted()).toBe(true);
    expect(store.stage()).toBe('testPending');
    response.next({
      state: 'providerAccepted',
      queued: 1,
      sendAfter: '2026-09-02T00:00:10Z',
    });
    response.complete();
    await sending;

    expect(store.stage()).toBe('testAccepted');
    expect(api.testPush).toHaveBeenCalledOnce();
  });
});
