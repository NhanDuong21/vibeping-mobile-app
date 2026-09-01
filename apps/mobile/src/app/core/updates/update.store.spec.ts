import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { UpdateStore } from './update.store';

describe('UpdateStore', () => {
  it('offers a deliberate update only after the new shell is ready', () => {
    const events = new Subject<{
      type: 'VERSION_READY';
      currentVersion: { hash: string };
      latestVersion: { hash: string };
    }>();
    TestBed.configureTestingModule({
      providers: [
        UpdateStore,
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: events,
            activateUpdate: vi.fn().mockResolvedValue(true),
          },
        },
      ],
    });
    const store = TestBed.inject(UpdateStore);
    store.start();
    expect(store.available()).toBe(false);
    events.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
    expect(store.available()).toBe(true);
    store.stop();
  });
});
