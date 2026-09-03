import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { ComputerStore } from './computer.store';

const status = {
  desktop: 'running',
  codex: 'connected',
  allowanceReader: 'available',
  notifications: 'ready',
  privateConnection: 'ready',
  lastSignalAt: '2026-09-02T01:00:00Z',
  startedAt: '2026-09-02T00:00:00Z',
};

describe('ComputerStore', () => {
  it('loads the operational status without exposing raw errors', async () => {
    TestBed.configureTestingModule({
      providers: [
        ComputerStore,
        { provide: ApiClient, useValue: { computerStatus: () => of(status) } },
      ],
    });
    const store = TestBed.inject(ComputerStore);
    await store.load();
    expect(store.state()).toBe('ready');
    expect(store.status()).toEqual(status);
    expect(store.lastSignalLabel(new Date('2026-09-04T01:00:00Z'))).toBe('2 ngày trước');
  });

  it('uses a recoverable unavailable state', async () => {
    TestBed.configureTestingModule({
      providers: [
        ComputerStore,
        {
          provide: ApiClient,
          useValue: { computerStatus: () => throwError(() => new Error('secret')) },
        },
      ],
    });
    const store = TestBed.inject(ComputerStore);
    await store.load();
    expect(store.state()).toBe('unavailable');
  });
});
