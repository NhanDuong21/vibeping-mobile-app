import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('production walking skeleton', () => {
  test('renders the operational shell without overflow or console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      if (!request.failure()?.errorText.includes('ERR_ABORTED')) {
        failedRequests.push(request.url());
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failedRequests.push(response.url());
    });
    const bootstrap = page.waitForResponse('**/api/v1/bootstrap');
    const stream = page.waitForRequest('**/api/v1/stream');

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      await page.setViewportSize(viewport);
      const activity = page.waitForResponse(/\/api\/v1\/events(\?.*)?$/);
      await page.goto(`/activity?viewport=${viewport.width}`);
      await expect(
        page.getByRole('heading', { name: 'Bạn có thể rời laptop' }),
      ).toBeVisible();
      expect((await activity).ok()).toBe(true);
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll).toBe(widths.client);
    }

    await expect((await bootstrap).ok()).toBe(true);
    await stream;
    expect(errors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test('refreshes a deep link and serves root-relative assets', async ({ page }) => {
    await page.goto('/settings/notifications');
    await expect(
      page.getByRole('heading', { name: 'Cài đặt' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);
    const assetPaths = await page
      .locator('link[rel="stylesheet"], script[src]')
      .evaluateAll((elements) =>
        elements.map(
          (element) =>
            element.getAttribute('href') ?? element.getAttribute('src'),
        ),
      );
    expect(assetPaths.every((path) => path?.startsWith('/'))).toBe(true);
  });

  test('is installable, accessible, and available from the offline shell', async ({
    context,
    page,
  }) => {
    await page.goto('/?pwa=prime');
    const manifest = await page.request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBe(true);
    await expect(manifest.json()).resolves.toMatchObject({
      name: 'VibePing',
      display: 'standalone',
      start_url: '/',
    });

    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Chưa kết nối được với laptop' }),
    ).toBeVisible();
  });

  test('shows current Codex work and privacy-safe recent activity', async ({
    page,
  }) => {
    await page.route('**/api/v1/bootstrap', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          currentWork: {
            projectName: 'vibeping-mobile-app',
            state: 'running',
            startedAt: '2026-09-02T00:00:00Z',
            updatedAt: '2026-09-02T00:01:00Z',
          },
          usageLimits: { state: 'available', readAt: null, windows: [], cursor: '1' },
          unreadCount: 1,
          serverTime: '2026-09-02T00:01:00Z',
          cursor: '1',
          connection: { desktop: 'running', codex: 'ready', privateConnection: 'local' },
        }),
      }),
    );
    await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'event-1',
              eventType: 'codex.attention.permission_required',
              title: 'Codex cần bạn xác nhận',
              summary: 'Mở laptop để xem và quyết định.',
              projectName: 'vibeping-mobile-app',
              occurredAt: '2026-09-02T00:01:00Z',
              isRead: false,
            },
          ],
          nextCursor: null,
          unreadCount: 1,
        }),
      }),
    );
    await page.goto('/activity');
    await expect(page.getByRole('heading', { name: 'Codex đang làm việc' })).toBeVisible();
    await expect(page.getByText('Cần xác nhận')).toBeVisible();
    await expect(page.getByText('Mở laptop để xem và quyết định.')).toBeVisible();
  });

  test('shows dynamic allowance windows and supports an explicit refresh', async ({
    page,
  }) => {
    const snapshot = {
      state: 'available',
      readAt: '2026-09-02T00:00:00Z',
      windows: [
        {
          windowKey: 'hashed-window',
          label: 'Lượt dùng 5 giờ',
          windowKind: 'primary',
          remainingPercent: 19,
          durationMinutes: 300,
          resetsAt: 2_000_000_000,
          reached: false,
        },
        {
          windowKey: 'hashed-week',
          label: 'Hạn mức tuần',
          windowKind: 'secondary',
          remainingPercent: 62,
          durationMinutes: 10_080,
          resetsAt: 2_000_100_000,
          reached: false,
        },
      ],
      cursor: '1',
    };
    await page.route(/\/api\/v1\/usage-limits$/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) }),
    );
    await page.route('**/api/v1/pairing/status', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          state: 'paired', ownerMatch: true, privateIdentityReady: true,
          codeExpiresAt: null, csrfToken: 'test-csrf',
        }),
      }),
    );
    await page.route(/\/api\/v1\/usage-limits\/refresh$/, (route) => {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(snapshot),
      });
    });

    await page.goto('/usage-limits');
    await expect(page.getByRole('heading', { name: 'Các chu kỳ đang dùng' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lượt dùng 5 giờ' })).toHaveAttribute(
      'aria-valuenow',
      '19',
    );
    await expect(page.getByText('Sắp thấp')).toBeVisible();
    const refreshRequest = page.waitForRequest('**/api/v1/usage-limits/refresh');
    await page.getByRole('button', { name: 'Cập nhật' }).click();
    await refreshRequest;
    await expect(page.getByRole('button', { name: 'Cập nhật' })).toBeEnabled();
    await expect(page.getByText(/prompt còn dùng được/)).toBeVisible();
  });
});
