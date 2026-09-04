import { expect, test } from "@playwright/test";
import {
  capture,
  measurableFindings,
  routeProduct,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

test("quiet work expires honestly and foreground sync clears a missed ending", async ({
  page,
}, testInfo) => {
  const now = new Date("2026-09-04T03:00:00Z");
  await page.addInitScript((dark) => {
    localStorage.setItem("vibeping.theme", dark ? "dark" : "light");
    localStorage.setItem("vibeping.theme.light-default-migrated", "1");
  }, testInfo.project.name.includes("dark"));
  await page.clock.install({ time: now });
  await routeProduct(page);
  let currentWork: object | null = {
    projectName: "vibeping-mobile-app-voi-ten-du-an-dai-de-kiem-tra",
    state: "running",
    lastTestState: "unknown",
    previewReady: false,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    freshUntil: new Date(now.getTime() + 120_000).toISOString(),
  };
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: now.toISOString(),
        cursor: "1",
        unreadCount: 0,
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        currentWork,
        usageLimits: {
          state: "available",
          readAt: null,
          windows: [],
          cursor: "1",
        },
      },
    }),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Codex đang làm việc" }),
  ).toBeVisible();
  await page.clock.fastForward(120_000);
  await expect(
    page.getByRole("heading", { name: "Chưa nhận tín hiệu mới từ Codex" }),
  ).toBeVisible();
  await expect(
    page.locator(".vibe-active-pulse, .vibe-signal-sweep"),
  ).toHaveCount(0);
  await expect(page.locator("app-live-status-card")).not.toContainText(
    "vừa hoàn tất",
  );
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await capture(page, testInfo, `${width}-unconfirmed-work`);
    expect(await measurableFindings(page, "unconfirmed work")).toEqual([]);
  }
  currentWork = null;
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(
    page.getByRole("heading", { name: "Codex đang nghỉ" }),
  ).toBeVisible();
});

test("a downloaded release displays its version in the theme-aware update notice", async ({
  page,
}) => {
  await routeProduct(page);
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Codex đang chờ bạn" }),
  ).toBeVisible();
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "VERSION_READY",
          currentVersion: { hash: "rc1" },
          latestVersion: { hash: "rc2", appData: { version: "1.0.0-rc.2" } },
        },
      }),
    ),
  );
  await expect(
    page.getByText("Phiên bản 1.0.0-rc.2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cập nhật", exact: true }),
  ).toBeEnabled();
});
