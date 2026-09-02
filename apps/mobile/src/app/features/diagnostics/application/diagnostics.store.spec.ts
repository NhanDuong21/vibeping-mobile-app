import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { DiagnosticsStore } from './diagnostics.store';

const report = {
  generatedAt: '2026-09-02T01:00:00Z',
  technicalReport: 'VibePing 1.0\ndesktop=running',
  checks: [
    {
      key: 'desktop',
      label: 'Ứng dụng trên laptop',
      state: 'ready',
      detail: 'VibePing đang chạy trên laptop.',
      action: null,
    },
  ],
};

describe('DiagnosticsStore', () => {
  it('runs a fresh check with the current mutation token', async () => {
    const api = {
      diagnostics: vi.fn().mockReturnValue(of(report)),
      pairingStatus: vi.fn().mockReturnValue(of({ csrfToken: 'csrf' })),
      runDiagnostics: vi.fn().mockReturnValue(of(report)),
    };
    TestBed.configureTestingModule({
      providers: [DiagnosticsStore, { provide: ApiClient, useValue: api }],
    });
    const store = TestBed.inject(DiagnosticsStore);
    await store.run();
    expect(api.runDiagnostics).toHaveBeenCalledWith('csrf');
    expect(store.report()).toEqual(report);
  });
});
