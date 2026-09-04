import { expect, test, type Page } from "@playwright/test";
import {
  capture,
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });
const profile = {
  projectName: "vibeping-mobile-app-voi-ten-du-an-dai-de-kiem-tra-xuong-dong",
  displayName: "VibePing cá nhân",
  icon: "cat",
  accent: "mint",
  notifyCompletion: true,
  notifyPermission: true,
  notifyPreview: true,
  notifyFinalFailure: true,
  completionMinMinutes: null,
  waitingReminderMinutes: null,
};
const session = {
  id: "personal-session",
  eventType: "codex.turn.completed",
  title: "Công việc đã hoàn tất",
  summary: "Tinh chỉnh tín hiệu cá nhân",
  projectName: profile.projectName,
  occurredAt: new Date().toISOString(),
  isRead: true,
  session: {
    eventIds: ["personal-session"],
    state: "completed",
    startedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failedTestCount: 1,
    timeline: [
      {
        eventType: "codex.turn.started",
        occurredAt: new Date(Date.now() - 18 * 60_000).toISOString(),
      },
      {
        eventType: "codex.test.failed",
        occurredAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      },
      {
        eventType: "codex.turn.completed",
        occurredAt: new Date().toISOString(),
      },
    ],
  },
};

async function routePersonal(page: Page): Promise<void> {
  await routeProduct(page);
  const at = new Date().toISOString();
  const started = new Date(Date.now() - 14 * 60_000).toISOString();
  const waiting = {
    ...session,
    id: "personal-waiting",
    eventType: "codex.attention.permission_required",
    occurredAt: at,
    session: {
      ...session.session,
      state: "waiting",
      completedAt: null,
      startedAt: started,
      updatedAt: at,
      failedTestCount: 0,
      timeline: [
        { eventType: "codex.turn.started", occurredAt: started },
        { eventType: "codex.attention.permission_required", occurredAt: at },
      ],
    },
  };
  const usage = {
    state: "available",
    readAt: at,
    cursor: "1",
    windows: [
      {
        windowKey: "primary",
        label: "Lượt dùng 5 giờ",
        windowKind: "primary",
        remainingPercent: 18,
        durationMinutes: 300,
        resetsAt: 2000000000,
        reached: false,
      },
    ],
  };
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: at,
        cursor: "1",
        unreadCount: 0,
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        currentWork: {
          sessionId: waiting.id,
          projectName: profile.projectName,
          state: "waiting",
          lastTestState: "unknown",
          previewReady: false,
          startedAt: started,
          updatedAt: at,
          freshUntil: new Date(Date.now() + 120000).toISOString(),
        },
        usageLimits: usage,
      },
    }),
  );
  await page.route("**/api/v1/usage-limits", (route) =>
    route.fulfill({ json: usage }),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      json: { events: [waiting], nextCursor: null, unreadCount: 0 },
    }),
  );
  await page.route("**/api/v1/personal/projects", async (route) => {
    if (route.request().method() === "PUT") {
      expect(route.request().headers()["x-vibeping-csrf"]).toBe("test-csrf");
      const value = route.request().postDataJSON();
      return route.fulfill({
        json: { ...value, displayName: String(value.displayName).trim() },
      });
    }
    return route.fulfill({ json: [profile] });
  });
  await page.route("**/api/v1/personal/rules", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ json: route.request().postDataJSON() })
      : route.fulfill({
          json: { completionMinMinutes: 2, waitingReminderMinutes: 5 },
        }),
  );
  await page.route("**/api/v1/personal/today**", (route) =>
    route.fulfill({
      json: {
        sessions: 6,
        completed: 5,
        failedTests: 1,
        observedSeconds: 8280,
      },
    }),
  );
  await page.route("**/api/v1/always-ready", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        autoStart: true,
        state: "healthy",
        checkedAt: new Date().toISOString(),
        recoveryCount: 1,
        trayAvailable: true,
      },
    }),
  );
  await page.route(/\/api\/v1\/events\?.*project=/, (route) => {
    expect(decodeURIComponent(route.request().url())).toContain(
      "project=" + profile.projectName,
    );
    return route.fulfill({
      json: { events: [session], nextCursor: null, unreadCount: 0 },
    });
  });
}

test("Personal keeps smart rules, project profiles and Windows readiness within Settings", async ({
  page,
}, testInfo) => {
  await routePersonal(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Báo theo cách của bạn" }),
  ).toBeVisible();
  await expect(page.getByLabel("Thông báo hoàn tất")).toHaveValue("2");
  await expect(page.getByText("Laptop đang sẵn sàng")).toBeVisible();
  await page.getByLabel("Nhắc lại khi Codex đang chờ").selectOption("10");
  await expect(page.getByText("Đã lưu lựa chọn.")).toBeVisible();
  await page
    .getByRole("heading", { name: "Báo theo cách của bạn" })
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, testInfo, "personal-settings");
  await page.route("**/api/v1/always-ready", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page.getByText("Chưa kiểm tra được laptop")).toBeVisible();
  await expect(page.getByText(/^Lần kiểm tra trước:/)).toBeVisible();
  await expect(page.getByText("Laptop đang sẵn sàng")).toHaveCount(0);
  await capture(page, testInfo, "personal-settings-stale");
  await page.getByRole("link", { name: /Dự án của bạn/ }).click();
  await expect(page.getByText("VibePing cá nhân")).toBeVisible();
  await page.getByRole("link", { name: /VibePing cá nhân/ }).click();
  await expect(
    page.getByRole("heading", { name: "VibePing cá nhân" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Phiên của dự án" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Màu nhấn").locator("option:checked"),
  ).toHaveText("Xanh bạc hà");
  await page.getByLabel("Tên hiển thị").fill("Mèo canh Codex");
  await page.getByRole("button", { name: "Lưu hồ sơ dự án" }).click();
  await expect(page.getByText("Đã lưu hồ sơ dự án.")).toBeVisible();
  expect(await measurableFindings(page, "project profile")).toEqual([]);
  await capture(page, testInfo, "personal-project-history");
  await page
    .getByRole("heading", { name: "Mèo canh Codex" })
    .scrollIntoViewIfNeeded();
  await page.locator("app-project-page > div").evaluate((element) => {
    element.scrollTop = 0;
  });
  await capture(page, testInfo, "personal-project");
  for (const width of [320, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "project profile " + width)).toEqual(
      [],
    );
    await capture(page, testInfo, "personal-project-" + width);
  }
});

test("Activity shows the living mascot and a compact truthful daily summary", async ({
  page,
}, testInfo) => {
  await routePersonal(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.goto("/activity");
  await expect(page.locator('[data-mascot-state="waiting"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hôm nay" })).toBeVisible();
  await expect(page.getByText("2 giờ 18 phút")).toBeVisible();
  await expect(page.getByText("VibePing cá nhân").first()).toBeVisible();
  expect(await measurableFindings(page, "personal activity")).toEqual([]);
  await capture(page, testInfo, "personal-activity");
  await page.getByRole("heading", { name: "Hôm nay" }).scrollIntoViewIfNeeded();
  await capture(page, testInfo, "personal-today");
});
