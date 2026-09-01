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
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
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
      await page.goto(`/?viewport=${viewport.width}`);
      await expect(
        page.getByRole('heading', { name: 'Đã kết nối với laptop' }),
      ).toBeVisible();
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
    await page.goto('/status/refresh-check');
    await expect(
      page.getByRole('heading', { name: 'Đã kết nối với laptop' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
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
});
