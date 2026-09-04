import { expect, test, type Page } from "@playwright/test";
import {
  capture,
  measurableFindings,
  routeProduct,
  seedActivityCache,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

const reading = {
  state: "available",
  readAt: "2026-09-04T03:00:00Z",
  cursor: "fixture",
  windows: [
    {
      windowKey: "primary",
      label: "Lượt dùng 5 giờ",
      windowKind: "primary",
      remainingPercent: 37,
      durationMinutes: 300,
      resetsAt: 1_788_498_000,
      reached: false,
    },
  ],
};
const unavailable = {
  state: "unavailable",
  readAt: null,
  cursor: "empty",
  windows: [],
};

async function unavailableBootstrap(page: Page): Promise<void> {
  // The app session now reads this endpoint on every operational route too.
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: new Date().toISOString(),
        cursor: "unavailable",
        unreadCount: 0,
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        currentWork: null,
        usageLimits: unavailable,
      },
    }),
  );
}

async function savedLimits(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open("vibeping-mobile", 2);
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    try {
      return await new Promise<{
        readAt: string;
        windows: { remainingPercent: number }[];
      } | null>((resolve, reject) => {
        const request = database
          .transaction("activity-feed")
          .objectStore("activity-feed")
          .get("last-usage-limits");
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

test.describe("last known allowance", () => {
  test.use({ serviceWorkers: "block" });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      class FixtureStream extends EventTarget {
        constructor() {
          super();
          Object.assign(window, { usageStream: this });
        }
        close() {}
      }
      Object.assign(window, { EventSource: FixtureStream });
    });
  });

  test("persists a real reading across reload, unavailable response, failed refresh and reconnect", async ({
    page,
  }, testInfo) => {
    await useExplicitProjectTheme(page, testInfo);
    await routeProduct(page);
    let connected = true;
    let current = reading;
    await page.route("**/api/v1/usage-limits", (route) =>
      route.fulfill({ json: connected ? current : unavailable }),
    );
    await page.route("**/api/v1/usage-limits/refresh", (route) =>
      route.abort(),
    );
    await page.goto("/usage-limits");
    await expect(page.getByText("37%", { exact: true })).toBeVisible();
    await expect
      .poll(() => savedLimits(page))
      .toMatchObject({ readAt: reading.readAt });
    const timestamp = await page.getByText(/Đọc lần cuối:/).textContent();
    connected = false;
    await page.reload();
    await expect(page.getByText("37%", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Đang hiển thị hạn mức lần cuối/),
    ).toBeVisible();
    await expect(page.getByText(/Đọc lần cuối:/)).toHaveText(timestamp!);
    await expect(
      page.getByText("Chưa đọc được hạn mức Codex", { exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Cập nhật", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Cập nhật", exact: true }),
    ).toBeEnabled();
    await expect(page.getByText("37%", { exact: true })).toBeVisible();
    for (const width of [320, 430]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await measurableFindings(page, `saved-limits-${width}`)).toEqual(
        [],
      );
      await capture(page, testInfo, `saved-limits-${width}`);
    }
    current = {
      ...reading,
      readAt: "2026-09-04T04:00:00Z",
      windows: [{ ...reading.windows[0], remainingPercent: 29 }],
    };
    connected = true;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByText("29%", { exact: true })).toBeVisible();
    await expect(page.getByText(/Đang hiển thị hạn mức lần cuối/)).toHaveCount(
      0,
    );
    await expect
      .poll(() => savedLimits(page))
      .toMatchObject({ readAt: current.readAt });
    await page.getByRole("link", { name: "Quay lại hoạt động" }).click();
    await expect(
      page
        .getByRole("region", { name: "Hạn mức Codex" })
        .getByText("29%", { exact: true }),
    ).toBeVisible();
    // Older bootstrap data must not replace the newly read limits.
    await expect
      .poll(() => savedLimits(page))
      .toMatchObject({ readAt: current.readAt });
  });

  test("migrates the previous release cache before Codex connects", async ({
    page,
  }, testInfo) => {
    await useExplicitProjectTheme(page, testInfo);
    await page.goto("/manifest.webmanifest");
    await seedActivityCache(page);
    await routeProduct(page);
    await unavailableBootstrap(page);
    await page.route("**/api/v1/usage-limits", (route) =>
      route.fulfill({ json: unavailable }),
    );
    await page.goto("/usage-limits");
    await expect(page.getByText("18%", { exact: true })).toBeVisible();
    await expect(page.getByText("62%", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Đang hiển thị hạn mức lần cuối/),
    ).toBeVisible();
    await expect
      .poll(() => savedLimits(page))
      .toMatchObject({ readAt: "2026-09-02T01:00:00Z" });
    await capture(page, testInfo, "migrated-usage-limits");
  });

  test("saves allowance stream updates from activity without visiting the detail page", async ({
    page,
  }, testInfo) => {
    await useExplicitProjectTheme(page, testInfo);
    await routeProduct(page);
    await page.goto("/activity");
    await expect(page.getByText("18%", { exact: true })).toBeVisible();
    await page.evaluate((snapshot) => {
      const stream = (window as unknown as { usageStream: EventTarget })
        .usageStream;
      stream.dispatchEvent(
        new MessageEvent("allowance", { data: JSON.stringify(snapshot) }),
      );
    }, reading);
    await expect(page.getByText("37%", { exact: true })).toBeVisible();
    await expect
      .poll(() => savedLimits(page))
      .toMatchObject({ readAt: reading.readAt });
    await page.route("**/api/v1/bootstrap", (route) => route.abort());
    await page.route("**/api/v1/usage-limits", (route) => route.abort());
    await page.reload();
    await expect(page.getByText("37%", { exact: true })).toBeVisible();
    await expect(page.getByText(/Dữ liệu lần cuối/)).toBeVisible();
    await capture(page, testInfo, "activity-saved-limits");
    await page.goto("/usage-limits");
    await expect(page.getByText("37%", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Đang hiển thị hạn mức lần cuối/),
    ).toBeVisible();
  });

  test("shows unavailable only when there has never been a saved reading", async ({
    page,
  }) => {
    await routeProduct(page);
    await unavailableBootstrap(page);
    await page.route("**/api/v1/usage-limits", (route) =>
      route.fulfill({ json: unavailable }),
    );
    await page.goto("/usage-limits");
    await expect(
      page.getByRole("heading", { name: "Chưa đọc được hạn mức Codex" }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  });
});

test("service worker cold-starts the limits detail with saved numbers while fully offline", async ({
  context,
  page,
}) => {
  await routeProduct(page);
  await page.route("**/api/v1/stream", (route) => route.abort());
  await page.goto("/activity");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.goto("/manifest.webmanifest");
  await seedActivityCache(page);
  // The shell-priming navigation may use the real worker's network path. Clear
  // only this disposable browser's dedicated reading to exercise RC2 migration.
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open("vibeping-mobile", 2);
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("activity-feed", "readwrite");
        transaction.objectStore("activity-feed").delete("last-usage-limits");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  });
  await context.setOffline(true);
  await page.goto("/usage-limits?offline=saved");
  await expect(page.getByText("18%", { exact: true })).toBeVisible();
  await expect(page.getByText("62%", { exact: true })).toBeVisible();
  await expect(page.getByText(/Đang hiển thị hạn mức lần cuối/)).toBeVisible();
  await expect
    .poll(() => savedLimits(page))
    .toMatchObject({ readAt: "2026-09-02T01:00:00Z" });
  await page.reload();
  await expect(page.getByText("18%", { exact: true })).toBeVisible();
});
