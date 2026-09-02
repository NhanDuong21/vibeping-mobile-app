import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const pairing = {
  state: 'paired',
  ownerMatch: true,
  privateIdentityReady: true,
  codeExpiresAt: null,
  csrfToken: 'test-csrf',
};

const preferences = {
  notifications: {
    completion: true,
    permission: true,
    preview: true,
    finalFailure: true,
    allowance: true,
  },
  allowanceThresholdPercent: 20,
  criticalAllowanceNotifications: true,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
    timezoneOffsetMinutes: 420,
    allowUrgent: true,
  },
  privacyMode: 'standard',
  theme: 'system',
  retentionDays: 30,
};

async function routePairing(page: Page): Promise<void> {
  await page.route('**/api/v1/pairing/status', (route) => route.fulfill({ json: pairing }));
}

test('computer summarizes readiness and queues a delayed notification test', async ({ page }) => {
  await routePairing(page);
  await page.route('**/api/v1/computer/status', (route) =>
    route.fulfill({
      json: {
        desktop: 'running',
        codex: 'connected',
        allowanceReader: 'available',
        notifications: 'ready',
        privateConnection: 'ready',
        lastSignalAt: '2026-09-02T01:00:00Z',
        startedAt: '2026-09-02T00:00:00Z',
      },
    }),
  );
  await page.route('**/api/v1/push/test', (route) =>
    route.fulfill({ json: { state: 'providerAccepted', queued: 1, sendAfter: '2026-09-02T01:00:10Z' } }),
  );

  await page.goto('/computer');
  await expect(page.getByRole('heading', { name: 'Máy tính' })).toBeVisible();
  await expect(page.getByText('Tích hợp đang nhận tín hiệu')).toBeVisible();
  await expect(page.getByText('Đang dùng kết nối Tailscale riêng tư')).toBeVisible();
  const request = page.waitForRequest('**/api/v1/push/test');
  await page.getByRole('button', { name: 'Gửi thông báo thử' }).click();
  expect((await request).headers()['x-vibeping-csrf']).toBe('test-csrf');
  await expect(page.getByText('Đã xếp gửi. Khóa màn hình và chờ thông báo.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Chạy chẩn đoán/ })).toBeVisible();
});

test('settings persist all behavior controls including overnight quiet hours', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', {
      configurable: true,
      get: () => 'denied' as NotificationPermission,
    });
  });
  await routePairing(page);
  let saved: unknown;
  await page.route('**/api/v1/preferences', async (route) => {
    if (route.request().method() === 'PUT') {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: saved });
    } else {
      await route.fulfill({ json: preferences });
    }
  });

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Cài đặt' })).toBeVisible();
  await page.getByRole('switch', { name: 'Thông báo công việc hoàn tất' }).click();
  await page.locator('#allowance-threshold').fill('27');
  await page.getByRole('switch', { name: 'Thông báo hạn mức nguy cấp' }).click();
  await page.locator('input[type="time"]').nth(0).fill('23:00');
  await page.locator('input[type="time"]').nth(1).fill('06:30');
  await page.getByRole('switch', { name: 'Cho phép thông báo gấp' }).click();
  await page.getByRole('button', { name: 'Chỉ báo có tín hiệu' }).click();
  await page.getByRole('button', { name: 'Tối', exact: true }).click();
  await page.locator('#retention').selectOption('90');
  const request = page.waitForRequest((value) =>
    value.url().endsWith('/api/v1/preferences') && value.method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
  await request;
  await expect(page.getByText('Đã áp dụng cài đặt.')).toBeVisible();
  expect(saved).toMatchObject({
    notifications: { completion: false },
    allowanceThresholdPercent: 27,
    criticalAllowanceNotifications: false,
    quietHours: { enabled: true, start: '23:00', end: '06:30', allowUrgent: false },
    privacyMode: 'private',
    theme: 'dark',
    retentionDays: 90,
  });

  await page.getByRole('button', { name: 'Đăng ký lại thông báo' }).click();
  await expect(page.getByText(/Quyền đang bị tắt/)).toBeVisible();
});

test('diagnostics gives recovery actions and copies only the sanitized report', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await routePairing(page);
  const report = {
    generatedAt: '2026-09-02T01:00:00Z',
    checks: [
      { key: 'desktop', label: 'Ứng dụng trên laptop', state: 'ready', detail: 'VibePing đang chạy trên laptop.', action: null },
      { key: 'notifications', label: 'Thông báo iPhone', state: 'needsAttention', detail: 'Mở Cài đặt và chọn Đăng ký lại thông báo.', action: 'Mở Cài đặt và chọn Đăng ký lại thông báo.' },
    ],
    technicalReport: 'VibePing 1.0.0-rc.1\ndesktop=running\nnotifications=needsAttention',
  };
  await page.route('**/api/v1/diagnostics', (route) => route.fulfill({ json: report }));
  await page.route('**/api/v1/diagnostics/run', (route) => route.fulfill({ json: report }));

  await page.goto('/diagnostics');
  await expect(page.getByRole('heading', { name: 'VibePing có sẵn sàng?' })).toBeVisible();
  await expect(page.getByText(/Việc cần làm:/)).toBeVisible();
  await page.getByText('Báo cáo kỹ thuật đã làm sạch').click();
  await page.getByRole('button', { name: 'Sao chép báo cáo' }).click();
  await expect(page.getByText('Đã sao chép báo cáo.')).toBeVisible();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n'))
    .toBe(report.technicalReport);
  const rerun = page.waitForRequest('**/api/v1/diagnostics/run');
  await page.getByRole('button', { name: 'Chạy kiểm tra lại' }).click();
  expect((await rerun).headers()['x-vibeping-csrf']).toBe('test-csrf');

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
