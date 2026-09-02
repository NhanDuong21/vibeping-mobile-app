import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";

export const event = {
  id: "phase-9-event",
  eventType: "codex.attention.permission_required",
  title: "Codex cần bạn xác nhận",
  summary: "Mở laptop để xem thay đổi và quyết định bước tiếp theo.",
  projectName: "vibeping-mobile-app-voi-ten-du-an-dai-de-kiem-tra-xuong-dong",
  occurredAt: "2026-09-02T01:00:00Z",
  isRead: false,
};

export const pairing = {
  state: "paired",
  ownerMatch: true,
  privateIdentityReady: true,
  codeExpiresAt: null,
  csrfToken: "test-csrf",
};

const usage = {
  state: "available",
  readAt: "2026-09-02T01:00:00Z",
  cursor: "1",
  windows: [
    {
      windowKey: "primary",
      label: "Lượt dùng 5 giờ",
      windowKind: "primary",
      remainingPercent: 18,
      durationMinutes: 300,
      resetsAt: 2_000_000_000,
      reached: false,
    },
    {
      windowKey: "secondary",
      label: "Chu kỳ dài trong tuần hiện tại",
      windowKind: "secondary",
      remainingPercent: 62,
      durationMinutes: 10_080,
      resetsAt: 2_000_100_000,
      reached: false,
    },
  ],
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
    start: "22:00",
    end: "07:00",
    timezoneOffsetMinutes: 420,
    allowUrgent: true,
  },
  privacyMode: "standard",
  theme: "system",
  retentionDays: 30,
};

export async function routeProduct(page: Page): Promise<void> {
  await page.route("**/api/v1/pairing/status", (route) =>
    route.fulfill({ json: pairing }),
  );
  await page.route("**/api/v1/push/public-key", (route) =>
    route.fulfill({ json: { publicKey: "test-public-key" } }),
  );
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: "2026-09-02T01:01:00Z",
        cursor: "1",
        unreadCount: 1,
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        currentWork: {
          projectName: event.projectName,
          state: "waiting",
          startedAt: "2026-09-02T00:50:00Z",
          updatedAt: "2026-09-02T01:00:00Z",
        },
        usageLimits: usage,
      },
    }),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      json: { events: [event], nextCursor: null, unreadCount: 1 },
    }),
  );
  await page.route("**/api/v1/events/phase-9-event", (route) =>
    route.fulfill({ json: event }),
  );
  await page.route("**/api/v1/events/phase-9-event/read", (route) =>
    route.fulfill({
      json: { state: "read", unreadCount: 0 },
    }),
  );
  await page.route("**/api/v1/usage-limits", (route) =>
    route.fulfill({ json: usage }),
  );
  await page.route("**/api/v1/preferences", (route) =>
    route.fulfill({ json: preferences }),
  );
  await page.route("**/api/v1/computer/status", (route) =>
    route.fulfill({
      json: {
        desktop: "running",
        codex: "connected",
        allowanceReader: "available",
        notifications: "ready",
        privateConnection: "ready",
        lastSignalAt: "2026-09-02T01:00:00Z",
        startedAt: "2026-09-02T00:00:00Z",
      },
    }),
  );
  await page.route("**/api/v1/diagnostics", (route) =>
    route.fulfill({
      json: {
        generatedAt: "2026-09-02T01:00:00Z",
        checks: [
          {
            key: "desktop",
            label: "Ứng dụng trên laptop",
            state: "ready",
            detail: "VibePing đang chạy trên laptop.",
            action: null,
          },
          {
            key: "notifications",
            label: "Thông báo iPhone",
            state: "needsAttention",
            detail: "Đăng ký cũ cần được tạo lại.",
            action: "Mở Cài đặt và chọn Đăng ký lại thông báo.",
          },
        ],
        technicalReport:
          "VibePing 1.0.0-rc.1\ndesktop=running\nnotifications=needsAttention",
      },
    }),
  );
}

export async function measurableFindings(
  page: Page,
  surface: string,
): Promise<string[]> {
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const metrics = await page.evaluate(() => {
    const visible = (element: Element): element is HTMLElement => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        box.width > 0 &&
        box.height > 0
      );
    };
    const small = [
      ...document.querySelectorAll("a, button, input, select, summary"),
    ]
      .filter(visible)
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          name:
            element.getAttribute("aria-label") ||
            element.textContent?.trim() ||
            element.tagName,
          width: box.width,
          height: box.height,
        };
      })
      .filter((target) => target.width < 44 || target.height < 44);
    return {
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      h1: [...document.querySelectorAll("h1")].filter(visible).length,
      small,
    };
  });
  const findings: string[] = [];
  if (accessibility.violations.length) {
    findings.push(
      ...accessibility.violations.map(
        (item) =>
          `${surface}: axe ${item.id} ${item.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
      ),
    );
  }
  if (metrics.scroll > metrics.client)
    findings.push(`${surface}: horizontal overflow`);
  if (metrics.h1 !== 1)
    findings.push(`${surface}: expected one visible h1, found ${metrics.h1}`);
  findings.push(
    ...metrics.small.map(
      (item) =>
        `${surface}: small target ${item.name} ${Math.round(item.width)}x${Math.round(item.height)}`,
    ),
  );
  return findings;
}

export async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const pass = process.env["VIBEPING_SCREENSHOT_PASS"];
  if (!pass) return;
  await page.screenshot({
    path: `.runtime/phase9/${pass}/${testInfo.project.name}-${name}.png`,
    fullPage: false,
  });
}

export async function seedActivityCache(page: Page): Promise<void> {
  await page.evaluate(
    async (snapshot) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const opening = indexedDB.open("vibeping-mobile", 2);
        opening.onupgradeneeded = () => {
          if (!opening.result.objectStoreNames.contains("activity-feed")) {
            opening.result.createObjectStore("activity-feed");
          }
        };
        opening.onsuccess = () => resolve(opening.result);
        opening.onerror = () => reject(opening.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("activity-feed", "readwrite");
        transaction.objectStore("activity-feed").put(snapshot, "snapshot");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    },
    {
      savedAt: "2026-09-02T01:00:00Z",
      currentWork: null,
      usageLimits: usage,
      unreadCount: 1,
      events: [event],
      nextCursor: null,
      pendingReadIds: [],
      pendingReadAll: false,
    },
  );
}
