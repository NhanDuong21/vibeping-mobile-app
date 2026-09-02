import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const event = {
  id: 'safe-event',
  eventType: 'codex.turn.completed',
  title: 'Codex đã hoàn tất',
  summary: 'Dữ liệu mới đã được đọc từ laptop.',
  projectName: 'vibeping-mobile-app',
  occurredAt: '2026-09-02T01:00:00Z',
  isRead: false,
};

async function routeActivity(page: Page, unsafeText?: string): Promise<void> {
  const displayedEvent = unsafeText
    ? { ...event, title: unsafeText, summary: unsafeText, projectName: unsafeText }
    : event;
  await page.route('**/api/v1/bootstrap', (route) =>
    route.fulfill({
      json: {
        serverTime: '2026-09-02T01:01:00Z',
        cursor: '1',
        connection: { desktop: 'running', codex: 'ready', privateConnection: 'local' },
        currentWork: null,
        unreadCount: 1,
        usageLimits: { state: 'unavailable', readAt: null, cursor: null, windows: [] },
      },
    }),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      json: { events: [displayedEvent], nextCursor: null, unreadCount: 1 },
    }),
  );
}

test('a corrupted optional activity cache is discarded and rebuilt from the laptop', async ({ page }) => {
  await routeActivity(page);
  await page.goto('/activity');
  await expect(page.getByText(event.summary)).toBeVisible();

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('vibeping-mobile', 2);
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('activity-feed', 'readwrite');
      transaction.objectStore('activity-feed').put(
        { savedAt: 'not-a-date', events: '<img src=x onerror=alert(1)>' },
        'snapshot',
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(page.getByText(event.summary)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const opening = indexedDB.open('vibeping-mobile', 2);
          opening.onsuccess = () => resolve(opening.result);
          opening.onerror = () => reject(opening.error);
        });
        const snapshot = await new Promise<unknown>((resolve, reject) => {
          const request = database
            .transaction('activity-feed')
            .objectStore('activity-feed')
            .get('snapshot');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        database.close();
        return Array.isArray((snapshot as { events?: unknown[] } | undefined)?.events);
      }),
    )
    .toBe(true);
});

test('server-provided activity text is rendered literally without executable markup', async ({ page }) => {
  const payload = '<img src=x onerror="window.__vibepingXss=true">';
  await routeActivity(page, payload);
  await page.goto('/activity');

  await expect(page.getByText(payload).first()).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, '__vibepingXss'))).toBeUndefined();
});
