import { expect, test, type Page } from "@playwright/test";

import {
  capture,
  measurableFindings,
  routeProduct,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

test("update and pull notices follow the app theme instead of the device theme", async ({
  page,
}, testInfo) => {
  const dark = testInfo.project.name.includes("dark");
  await page.emulateMedia({ colorScheme: dark ? "light" : "dark" });
  await selectTheme(page, dark ? "dark" : "light");
  await routeProduct(page);

  for (const width of [320, 430, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/activity");
    await showNotices(page);
    await capture(page, testInfo, `${width}-theme-notices`);
    await expectNoticeColors(page, dark);
    expect(await measurableFindings(page, "theme notices")).toEqual([]);
    await page
      .locator("app-pull-to-refresh")
      .evaluate((element) =>
        element.dispatchEvent(new TouchEvent("touchcancel", { bubbles: true })),
      );
    await expect(page.getByRole("status")).toHaveCount(0);
  }
});

test("visible notices follow system theme changes without reloading", async ({
  page,
}, testInfo) => {
  const dark = testInfo.project.name.includes("dark");
  await selectTheme(page, "system");
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
  await routeProduct(page);
  await page.goto("/activity");
  await showNotices(page);
  await expectNoticeColors(page, dark);
  await page.emulateMedia({ colorScheme: dark ? "light" : "dark" });
  await expectNoticeColors(page, !dark);
  await expect(
    page.getByText("Có bản VibePing mới", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Kéo xuống để làm mới", { exact: true }),
  ).toBeVisible();
});

async function selectTheme(
  page: Page,
  theme: "light" | "dark" | "system",
): Promise<void> {
  await page.addInitScript((preference) => {
    localStorage.setItem("vibeping.theme", preference);
    localStorage.setItem("vibeping.theme.light-default-migrated", "1");
  }, theme);
}

async function showNotices(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Codex đang chờ bạn" }),
  ).toBeVisible();
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "VERSION_READY",
          currentVersion: { hash: "current" },
          latestVersion: { hash: "next" },
        },
      }),
    ),
  );
  await expect(
    page.getByText("Có bản VibePing mới", { exact: true }),
  ).toBeVisible();
  await page.locator("app-pull-to-refresh").evaluate((element) => {
    for (const [type, clientY] of [
      ["touchstart", 100],
      ["touchmove", 180],
    ] as const) {
      const touch = new Touch({
        identifier: 1,
        target: element,
        clientX: 40,
        clientY,
      });
      element.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: [touch],
        }),
      );
    }
  });
  await expect(
    page.getByText("Kéo xuống để làm mới", { exact: true }),
  ).toBeVisible();
}

async function expectNoticeColors(page: Page, dark: boolean): Promise<void> {
  const background = dark ? "rgb(16, 36, 27)" : "rgb(255, 255, 255)";
  const foreground = dark ? "rgb(243, 248, 245)" : "rgb(16, 37, 28)";
  const update = page.locator("section").filter({
    has: page.getByText("Có bản VibePing mới", { exact: true }),
  });
  const pull = page.getByRole("status").locator("div").first();
  for (const notice of [update, pull]) {
    await expect(notice).toHaveCSS("background-color", background);
    await expect(notice).toHaveCSS("color", foreground);
  }
  await expect(update.locator("p").last()).toHaveCSS(
    "color",
    dark ? "rgb(159, 185, 170)" : "rgb(88, 112, 101)",
  );
}
