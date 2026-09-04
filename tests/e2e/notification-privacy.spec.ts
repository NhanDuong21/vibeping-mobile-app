import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  capture,
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

const preview = {
  source: "activity",
  private: {
    title: "Codex đã xong việc",
    body: "Mở VibePing để xem chi tiết.",
  },
  project: { title: "Codex đã xong việc", body: "vibeping-mobile-app" },
  standard: {
    title: "Codex đã xong việc",
    body: "Hoàn thiện màn Hoạt động · vibeping-mobile-app",
  },
};

async function setup(page: Page, info: TestInfo) {
  await routeProduct(page);
  await useExplicitProjectTheme(page, info);
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    } as typeof EventSource;
  });
  let preferences = {
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
      enabled: false,
      start: "22:00",
      end: "07:00",
      timezoneOffsetMinutes: 420,
      allowUrgent: true,
    },
    privacyMode: "standard",
    theme: info.project.name.includes("dark") ? "dark" : "light",
    retentionDays: 30,
  };
  await page.route("**/api/v1/preferences", (route) => {
    if (route.request().method() === "PUT")
      preferences = route.request().postDataJSON();
    return route.fulfill({ json: preferences });
  });
  let requests = 0;
  await page.route("**/api/v1/notifications/preview", (route) => {
    requests++;
    return route.fulfill({ json: preview });
  });
  return () => requests;
}

test("privacy switches immediately without reload and persists the selected mode", async ({
  page,
}, info) => {
  const requests = await setup(page, info);
  await page.goto("/settings");
  const card = page.getByRole("region", { name: "Xem trước thông báo" });
  await expect(card).toContainText(preview.standard.body);
  const started = await page.evaluate(() => performance.timeOrigin);
  for (const [label, body] of [
    ["Chỉ báo", preview.private.body],
    ["Tên dự án", preview.project.body],
    ["Hiện tóm tắt", preview.standard.body],
  ]) {
    const button = page.getByRole("button", { name: label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator('[aria-hidden="true"]')).toHaveCount(0);
    await expect(card).toContainText(body);
    await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Chỉ báo", exact: true }).click();
  await expect(card).not.toContainText("vibeping-mobile-app");
  await expect(card).not.toContainText("Hoạt động");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(started);
  expect(requests()).toBe(1);
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Chỉ báo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("privacy preview is accessible at phone widths in all modes", async ({
  page,
}, info) => {
  await setup(page, info);
  await page.goto("/settings");
  const section = page.locator("app-notification-privacy");
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const label of ["Chỉ báo", "Tên dự án", "Hiện tóm tắt"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(
        section
          .getByRole("region", { name: "Xem trước thông báo" })
          .locator('[aria-hidden="true"]'),
      ).toHaveCount(0);
      await section.evaluate((element) =>
        element.scrollIntoView({ block: "start" }),
      );
      expect(
        await measurableFindings(page, `notification-${width}-${label}`),
      ).toEqual([]);
      await capture(page, info, `notification-${width}-${label}`);
    }
  }
});

test("sample, error recovery, long copy, and reduced motion remain honest", async ({
  page,
}, info) => {
  await setup(page, info);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let unavailable = true;
  await page.route("**/api/v1/notifications/preview", (route) =>
    unavailable
      ? route.abort()
      : route.fulfill({
          json: {
            ...preview,
            source: "sample",
            standard: {
              title: "Bản xem trước đã sẵn sàng",
              body: "Hoàn thiện màn Cài đặt và phần thông báo trên iPhone · vibeping-mobile-app-voi-ten-du-an-dai",
            },
          },
        }),
  );
  await page.goto("/settings");
  await expect(
    page.getByText("Chưa tải được ví dụ thông báo.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Xem trước thông báo" }),
  ).toHaveCount(0);
  unavailable = false;
  await page.getByRole("button", { name: "Tải lại ví dụ" }).click();
  await expect(
    page.getByText("Ví dụ minh họa.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  const section = page.locator("app-notification-privacy");
  await section.evaluate((element) =>
    element.scrollIntoView({ block: "start" }),
  );
  expect(await measurableFindings(page, "notification-long")).toEqual([]);
  await capture(page, info, "notification-long-reduced-motion");
  for (const label of ["Chỉ báo", "Hiện tóm tắt", "Tên dự án", "Chỉ báo"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  expect(
    await section.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await expect(
    page.getByRole("region", { name: "Xem trước thông báo" }),
  ).not.toContainText("vibeping-mobile-app");
});
