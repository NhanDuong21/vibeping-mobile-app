import { expect, test, type Page } from "@playwright/test";
import {
  capture,
  event,
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

async function liveFixture(page: Page) {
  await routeProduct(page);
  await page.addInitScript(() => {
    class LiveStream extends EventTarget {
      readyState = 1;
      onopen = null;
      onerror = null;
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("connected")), 0);
        window.addEventListener("realtime-test", ((event: CustomEvent) => {
          if (this.readyState !== 2)
            this.dispatchEvent(
              new MessageEvent(event.detail.type, {
                data: JSON.stringify(event.detail.value),
              }),
            );
        }) as EventListener);
      }
      close(): void {
        this.readyState = 2;
      }
    }
    Object.defineProperty(window, "EventSource", { value: LiveStream });
  });
  const work = {
    projectName: "VibePing",
    state: "running",
    lastTestState: "unknown",
    previewReady: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    freshUntil: new Date(Date.now() + 120_000).toISOString(),
  };
  const snapshot = {
    serverTime: new Date().toISOString(),
    cursor: "1",
    unreadCount: 1,
    connection: {
      desktop: "running",
      codex: "ready",
      privateConnection: "local",
    },
    currentWork: work as typeof work | null,
    usageLimits: { state: "available", readAt: null, windows: [], cursor: "1" },
  };
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({ json: snapshot }),
  );
  return { snapshot, work };
}

test("live status still changes immediately after detail and tab navigation without reloading", async ({
  page,
}) => {
  const { snapshot, work } = await liveFixture(page);
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Codex đang làm việc" }),
  ).toBeVisible();
  await page.evaluate(
    () => (document.documentElement.dataset["samePage"] = "yes"),
  );
  await page.locator('a[href="/activity/events/phase-9-event"]').click();
  await expect(
    page.getByRole("heading", { name: "Codex đang chờ bạn" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Quay lại hoạt động" }).click();
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await navigation.getByRole("link", { name: "Cài đặt" }).click();
  await expect(
    page.getByRole("heading", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await navigation.getByRole("link", { name: /Hoạt động/ }).click();
  snapshot.currentWork = { ...work, state: "waiting" };
  await page.evaluate(
    (value) =>
      window.dispatchEvent(
        new CustomEvent("realtime-test", { detail: { type: "work", value } }),
      ),
    snapshot.currentWork,
  );
  await expect(page.locator("app-live-status-card h1")).toHaveText(
    "Codex đang chờ bạn",
  );
  snapshot.currentWork = null;
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("realtime-test", {
        detail: { type: "work", value: null },
      }),
    ),
  );
  await expect(page.locator("app-live-status-card h1")).toHaveText(
    "Codex đang nghỉ",
  );
  await expect(page.locator("html")).toHaveAttribute("data-same-page", "yes");
});

test("a missed stream update is recovered by the foreground snapshot without reload", async ({
  page,
}) => {
  const { snapshot, work } = await liveFixture(page);
  await page.clock.install();
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Codex đang làm việc" }),
  ).toBeVisible();
  await page.evaluate(
    () => (document.documentElement.dataset["samePage"] = "yes"),
  );
  snapshot.currentWork = { ...work, state: "waiting" };
  await page.clock.runFor(15_000);
  await expect(page.locator("app-live-status-card h1")).toHaveText(
    "Codex đang chờ bạn",
  );
  snapshot.currentWork = null;
  await page.clock.runFor(15_000);
  await expect(page.locator("app-live-status-card h1")).toHaveText(
    "Codex đang nghỉ",
  );
  await expect(page.locator("html")).toHaveAttribute("data-same-page", "yes");
});

test("failed-test copy explains the project check and the historical result at phone widths", async ({
  page,
}, testInfo) => {
  const { snapshot, work } = await liveFixture(page);
  await useExplicitProjectTheme(page, testInfo);
  snapshot.currentWork = { ...work, lastTestState: "failed" };
  const failed = {
    ...event,
    eventType: "codex.test.failed",
    summary: "Codex đã dừng với một kiểm tra chưa đạt.",
  };
  await page.route("**/api/v1/events/phase-9-event", (route) =>
    route.fulfill({
      json: {
        ...failed,
        timeline: [
          { eventType: failed.eventType, occurredAt: failed.occurredAt },
        ],
      },
    }),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Kiểm thử mã nguồn chưa đạt" }),
  ).toBeVisible();
  await expect(page.locator("app-live-status-card")).toContainText(
    "Codex có thể vẫn đang sửa",
  );
  await capture(page, testInfo, "320-test-status-copy");
  expect(await measurableFindings(page, "test status copy")).toEqual([]);
  await page.locator('a[href="/activity/events/phase-9-event"]').click();
  await expect(
    page.getByRole("heading", { name: "Kiểm thử mã nguồn chưa đạt" }),
  ).toBeVisible();
  await expect(page.locator("app-event-detail-page")).toContainText(
    "tại thời điểm thông báo",
  );
  await expect(page.locator("app-event-detail-page")).toContainText(
    "mở Codex trên laptop",
  );
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await capture(page, testInfo, `${width}-test-history-copy`);
    expect(await measurableFindings(page, "test history copy")).toEqual([]);
  }
});
