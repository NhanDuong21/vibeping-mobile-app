import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiClient, type NotificationPreviewDto } from '../../../core/api/api-client';
import { NotificationPreviewStore } from './notification-preview.store';

const preview: NotificationPreviewDto = {
  source: 'sample',
  private: { title: 'Codex đã xong việc', body: 'Mở VibePing để xem chi tiết.' },
  project: { title: 'Codex đã xong việc', body: 'vibeping-mobile-app' },
  standard: { title: 'Codex đã xong việc', body: 'Hoàn thiện màn Hoạt động · vibeping-mobile-app' },
};

function setup() {
  const api = { notificationPreview: vi.fn().mockReturnValue(of(preview)) };
  TestBed.configureTestingModule({ providers: [{ provide: ApiClient, useValue: api }] });
  return { api, store: TestBed.inject(NotificationPreviewStore) };
}

describe('NotificationPreviewStore', () => {
  it('loads all three modes once without composing a different client copy', async () => {
    const { api, store } = setup();
    await store.load();
    expect(store.state()).toBe('ready');
    expect(store.snapshot()).toEqual(preview);
    expect(api.notificationPreview).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable and retries without fabricating activity', async () => {
    const { api, store } = setup();
    api.notificationPreview.mockReturnValueOnce(throwError(() => new Error('offline')));
    await store.load();
    expect(store.state()).toBe('unavailable');
    expect(store.snapshot()).toBeNull();
    await store.load();
    expect(store.state()).toBe('ready');
  });

  it('ignores an older response that arrives after a retry', async () => {
    const { api, store } = setup();
    const older = new Subject<NotificationPreviewDto>();
    api.notificationPreview.mockReturnValueOnce(older);
    const pending = store.load();
    await store.load();
    older.next({ ...preview, source: 'activity' });
    await pending;
    expect(store.snapshot()?.source).toBe('sample');
  });
});
