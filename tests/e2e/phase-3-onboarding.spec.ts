import { expect, test, type Page } from "@playwright/test";

const paired = {
  state: "paired",
  ownerMatch: true,
  privateIdentityReady: true,
  codeExpiresAt: null,
  csrfToken: "test-csrf",
};

async function mockStart(
  page: Page,
  status: Record<string, unknown>,
): Promise<void> {
  await page.route("**/api/v1/pairing/status", (route) =>
    route.fulfill({ json: status }),
  );
  await page.route("**/api/v1/push/public-key", (route) =>
    route.fulfill({ json: { publicKey: "test-public-key" } }),
  );
}

test("completed setup opens Activity instead of repeating onboarding", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("vibeping.onboarding-state", "completed");
  });

  await page.goto("/");

  await expect(page).toHaveURL(/\/activity$/);
  await expect(
    page.getByRole("heading", { name: "Bạn có thể rời laptop" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục" })).toHaveCount(0);
});

test("existing subscriptions skip onboarding after an app update", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("vibeping.subscription-id", "subscription-existing");
  });

  await page.goto("/onboarding");

  await expect(page).toHaveURL(/\/activity$/);
});

test("regular Safari tab gives install instructions and never asks permission", async ({
  page,
}) => {
  await mockStart(page, paired);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Cài VibePing lên Màn hình chính" }),
  ).toBeVisible();
  await expect(
    page.getByText("VibePing sẽ không hỏi quyền thông báo"),
  ).toBeVisible();
});

test("installed app distinguishes default and denied notification permission", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query === "(display-mode: standalone)"
        ? ({ matches: true, media: query } as MediaQueryList)
        : original(query);
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      get: () => "denied" as NotificationPermission,
    });
  });
  await mockStart(page, paired);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Thông báo đang bị tắt" }),
  ).toBeVisible();
});

test("installed app waits for an explicit tap before requesting default permission", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query === "(display-mode: standalone)"
        ? ({ matches: true, media: query } as MediaQueryList)
        : original(query);
  });
  await mockStart(page, paired);
  await page.goto("/onboarding");
  await page.evaluate(() => {
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      get: () => "default" as NotificationPermission,
    });
  });
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Bật thông báo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bật thông báo" }),
  ).toBeVisible();
});

test("notification settings deep link is refreshable and the custom worker owns no duplicate handler", async ({
  page,
}) => {
  await mockStart(page, paired);
  await page.goto("/settings/notifications");
  await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
  const worker = await (await page.request.get("/sw.js")).text();
  expect(worker.trim()).toBe("importScripts('./ngsw-worker.js');");
  expect(worker).not.toContain("addEventListener('push'");
  expect(worker).not.toContain("addEventListener('notificationclick'");
});
