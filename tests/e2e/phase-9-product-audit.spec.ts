import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const event = {
  id: 'phase-9-event',
  eventType: 'codex.attention.permission_required',
  title: 'Codex cần bạn xác nhận',
  summary: 'Mở laptop để xem thay đổi và quyết định bước tiếp theo.',
  projectName: 'vibeping-mobile-app-voi-ten-du-an-dai-de-kiem-tra-xuong-dong',
  occurredAt: '2026-09-02T01:00:00Z',
  isRead: false,
};

const pairing = {
  state: 'paired', ownerMatch: true, privateIdentityReady: true,
  codeExpiresAt: null, csrfToken: 'test-csrf',
};

const usage = {
  state: 'available', readAt: '2026-09-02T01:00:00Z', cursor: '1',
  windows: [
    {
      windowKey: 'primary', label: 'Lượt dùng 5 giờ', windowKind: 'primary',
      remainingPercent: 18, durationMinutes: 300, resetsAt: 2_000_000_000,
      reached: false,
    },
    {
      windowKey: 'secondary', label: 'Chu kỳ dài trong tuần hiện tại',
      windowKind: 'secondary', remainingPercent: 62, durationMinutes: 10_080,
      resetsAt: 2_000_100_000, reached: false,
    },
  ],
};

const preferences = {
  notifications: {
    completion: true, permission: true, preview: true, finalFailure: true,
    allowance: true,
  },
  allowanceThresholdPercent: 20,
  criticalAllowanceNotifications: true,
  quietHours: {
    enabled: true, start: '22:00', end: '07:00',
    timezoneOffsetMinutes: 420, allowUrgent: true,
  },
  privacyMode: 'standard', theme: 'system', retentionDays: 30,
};

async function routeProduct(page: Page): Promise<void> {
  await page.route('**/api/v1/pairing/status', (route) => route.fulfill({ json: pairing }));
  await page.route('**/api/v1/push/public-key', (route) =>
    route.fulfill({ json: { publicKey: 'test-public-key' } }),
  );
  await page.route('**/api/v1/bootstrap', (route) => route.fulfill({
    json: {
      serverTime: '2026-09-02T01:01:00Z', cursor: '1', unreadCount: 1,
      connection: { desktop: 'running', codex: 'ready', privateConnection: 'local' },
      currentWork: {
        projectName: event.projectName, state: 'waiting',
        startedAt: '2026-09-02T00:50:00Z', updatedAt: '2026-09-02T01:00:00Z',
      },
      usageLimits: usage,
    },
  }));
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) => route.fulfill({
    json: { events: [event], nextCursor: null, unreadCount: 1 },
  }));
  await page.route('**/api/v1/events/phase-9-event', (route) => route.fulfill({ json: event }));
  await page.route('**/api/v1/events/phase-9-event/read', (route) =>
    route.fulfill({ json: { state: 'read', unreadCount: 0 } }),
  );
  await page.route('**/api/v1/usage-limits', (route) => route.fulfill({ json: usage }));
  await page.route('**/api/v1/preferences', (route) => route.fulfill({ json: preferences }));
  await page.route('**/api/v1/computer/status', (route) => route.fulfill({
    json: {
      desktop: 'running', codex: 'connected', allowanceReader: 'available',
      notifications: 'ready', privateConnection: 'ready',
      lastSignalAt: '2026-09-02T01:00:00Z', startedAt: '2026-09-02T00:00:00Z',
    },
  }));
  await page.route('**/api/v1/diagnostics', (route) => route.fulfill({
    json: {
      generatedAt: '2026-09-02T01:00:00Z',
      checks: [
        { key: 'desktop', label: 'Ứng dụng trên laptop', state: 'ready', detail: 'VibePing đang chạy trên laptop.', action: null },
        { key: 'notifications', label: 'Thông báo iPhone', state: 'needsAttention', detail: 'Đăng ký cũ cần được tạo lại.', action: 'Mở Cài đặt và chọn Đăng ký lại thông báo.' },
      ],
      technicalReport: 'VibePing 1.0.0-rc.1\ndesktop=running\nnotifications=needsAttention',
    },
  }));
}

test('all primary surfaces hold their quality bar at target widths and text stress', async ({ page }, testInfo) => {
  await routeProduct(page);
  const surfaces = [
    { name: 'onboarding', path: '/onboarding', width: 320, heading: 'Tín hiệu từ Codex, gửi thẳng đến điện thoại.' },
    { name: 'activity', path: '/activity', width: 375, heading: 'Codex đang chờ bạn' },
    { name: 'event-detail', path: '/activity/events/phase-9-event', width: 390, heading: event.title },
    { name: 'allowance', path: '/usage-limits', width: 430, heading: 'Các chu kỳ đang dùng' },
    { name: 'computer', path: '/computer', width: 320, heading: 'Máy tính' },
    { name: 'settings', path: '/settings', width: 375, heading: 'Cài đặt' },
    { name: 'diagnostics', path: '/diagnostics', width: 430, heading: 'VibePing có sẵn sàng?' },
  ];
  const findings: string[] = [];

  for (const surface of surfaces) {
    await page.setViewportSize({ width: surface.width, height: 844 });
    await page.goto(surface.path);
    await expect(page.getByRole('heading', { name: surface.heading })).toBeVisible();
    await capture(page, testInfo, `${surface.width}-${surface.name}`);
    findings.push(...await measurableFindings(page, surface.name));

    if (surface.name === 'activity') {
      await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'VERSION_READY',
          currentVersion: { hash: 'current' },
          latestVersion: { hash: 'next' },
        },
      })));
      await expect(page.getByText('Có bản VibePing mới')).toBeVisible();
      await capture(page, testInfo, `${surface.width}-update-available`);
    }

    await page.evaluate(() => document.documentElement.style.fontSize = '125%');
    const stressed = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    if (stressed.scroll > stressed.client) findings.push(`${surface.name}: text stress overflows`);
    await expect(page.getByRole('heading', { name: surface.heading })).toBeVisible();
    await page.evaluate(() => document.documentElement.style.fontSize = '');
  }

  expect(findings).toEqual([]);
});

test('recovery surfaces remain calm, actionable, and technically opaque', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => query === '(display-mode: standalone)'
      ? ({ matches: true, media: query } as MediaQueryList)
      : original(query);
    Object.defineProperty(Notification, 'permission', {
      configurable: true,
      get: () => 'denied' as NotificationPermission,
    });
  });
  await routeProduct(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(page.getByRole('heading', { name: 'Thông báo đang bị tắt' })).toBeVisible();
  await capture(page, testInfo, '390-permission-denied');

  await page.route('**/api/v1/computer/status', (route) => route.fulfill({
    json: {
      desktop: 'running', codex: 'connected', allowanceReader: 'available',
      notifications: 'needsAttention', privateConnection: 'ready',
      lastSignalAt: '2026-09-02T01:00:00Z', startedAt: '2026-09-02T00:00:00Z',
    },
  }));
  await page.goto('/computer?subscription=stale');
  await expect(page.getByText('Cần đăng ký lại trên iPhone')).toBeVisible();
  await capture(page, testInfo, '390-stale-subscription');

  await page.route('**/api/v1/computer/status', (route) => route.fulfill({ status: 503 }));
  await page.goto('/computer');
  await expect(page.getByRole('heading', { name: 'Chưa đọc được trạng thái laptop' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  await capture(page, testInfo, '390-desktop-stopped');

  await seedActivityCache(page);
  await page.route('**/api/v1/bootstrap', (route) => route.abort('internetdisconnected'));
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) => route.abort('internetdisconnected'));
  await page.goto('/activity?network=offline');
  await expect(page.getByText('Đang hiển thị dữ liệu đã lưu. VibePing sẽ đồng bộ khi laptop kết nối lại.')).toBeVisible();
  await capture(page, testInfo, '390-offline');

  await page.route('**/api/v1/pairing/status', (route) => route.fulfill({
    json: { ...pairing, state: 'pairingRequired', ownerMatch: false },
  }));
  await page.route('**/api/v1/pairing/claim', (route) => route.fulfill({
    status: 500, json: { code: 'UNEXPECTED_INTERNAL_DETAIL' },
  }));
  await page.goto('/onboarding?unexpected=1');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.locator('#pairing-code').fill('ABCD-EFGH');
  await page.getByRole('button', { name: 'Kết nối' }).click();
  await expect(page.getByText('Đã có lỗi khi kiểm tra.')).toBeVisible();
  await expect(page.getByText('UNEXPECTED_INTERNAL_DETAIL')).toHaveCount(0);
  await capture(page, testInfo, '390-unexpected-safe-error');

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('system theme, reduced motion, and keyboard focus retain usable feedback', async ({ page }, testInfo) => {
  await routeProduct(page);
  const dark = testInfo.project.name.includes('dark');
  await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
  await page.goto('/settings');
  await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*dark)/);
  const toggleTransition = await page.locator('app-toggle-switch span').first()
    .evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(toggleTransition).toBe('none');

  await page.route('**/api/v1/diagnostics', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      json: { generatedAt: '2026-09-02T01:00:00Z', checks: [], technicalReport: 'VibePing 1.0.0-rc.1' },
    });
  });
  await page.goto('/diagnostics?motion=reduced');
  const skeleton = page.locator('.animate-pulse').first();
  await expect(skeleton).toBeVisible();
  expect(await skeleton.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');

  await page.goto('/activity?input=keyboard');
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'SUMMARY'];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    if (tag && interactiveTags.includes(tag)) break;
  }
  const focus = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    const style = element ? getComputedStyle(element) : null;
    const box = element?.getBoundingClientRect();
    return {
      tag: element?.tagName,
      outline: style?.outlineStyle,
      visible: Boolean(box && box.width > 0 && box.height > 0),
    };
  });
  expect(focus.visible).toBe(true);
  expect(interactiveTags).toContain(focus.tag);
  expect(focus.outline).not.toBe('none');
});

async function measurableFindings(page: Page, surface: string): Promise<string[]> {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const metrics = await page.evaluate(() => {
    const visible = (element: Element): element is HTMLElement => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
    };
    const small = [...document.querySelectorAll('a, button, input, select, summary')]
      .filter(visible)
      .map((element) => {
        const box = element.getBoundingClientRect();
        return { name: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName, width: box.width, height: box.height };
      })
      .filter((target) => target.width < 44 || target.height < 44);
    return {
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      h1: [...document.querySelectorAll('h1')].filter(visible).length,
      small,
    };
  });
  const findings: string[] = [];
  if (accessibility.violations.length) {
    findings.push(...accessibility.violations.map((item) =>
      `${surface}: axe ${item.id} ${item.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
    ));
  }
  if (metrics.scroll > metrics.client) findings.push(`${surface}: horizontal overflow`);
  if (metrics.h1 !== 1) findings.push(`${surface}: expected one visible h1, found ${metrics.h1}`);
  findings.push(...metrics.small.map((item) => `${surface}: small target ${item.name} ${Math.round(item.width)}x${Math.round(item.height)}`));
  return findings;
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const pass = process.env['VIBEPING_SCREENSHOT_PASS'];
  if (!pass) return;
  await page.screenshot({
    path: `.runtime/phase9/${pass}/${testInfo.project.name}-${name}.png`,
    fullPage: false,
  });
}

async function seedActivityCache(page: Page): Promise<void> {
  await page.evaluate(async (snapshot) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('vibeping-mobile', 2);
      opening.onupgradeneeded = () => {
        if (!opening.result.objectStoreNames.contains('activity-feed')) {
          opening.result.createObjectStore('activity-feed');
        }
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('activity-feed', 'readwrite');
      transaction.objectStore('activity-feed').put(snapshot, 'snapshot');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, {
    savedAt: '2026-09-02T01:00:00Z', currentWork: null, usageLimits: usage,
    unreadCount: 1, events: [event], nextCursor: null,
    pendingReadIds: [], pendingReadAll: false,
  });
}
