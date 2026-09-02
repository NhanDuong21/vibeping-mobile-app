import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  capture,
  event,
  measurableFindings,
  pairing,
  routeProduct,
  seedActivityCache,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

test("product mastheads use the installed VibePing app icon", async ({
  page,
}, testInfo) => {
  await useExplicitProjectTheme(page, testInfo);
  await routeProduct(page);

  for (const path of ["/onboarding", "/activity"]) {
    await page.goto(path);
    const logo = page.locator('header img[src="/assets/logo-icon-192.png"]');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("alt", "");
    const image = await logo.evaluate((element: HTMLImageElement) => ({
      complete: element.complete,
      currentPath: new URL(element.currentSrc).pathname,
      naturalWidth: element.naturalWidth,
    }));
    expect(image.complete).toBe(true);
    expect(image.currentPath).toMatch(/^\/assets\/logo-icon-(192|512)\.png$/);
    expect(image.naturalWidth).toBeGreaterThanOrEqual(40);
    await expect(
      page.locator("header").getByText("V", { exact: true }),
    ).toHaveCount(0);
  }
});

test("all primary surfaces hold their quality bar at target widths and text stress", async ({
  page,
}, testInfo) => {
  await useExplicitProjectTheme(page, testInfo);
  await routeProduct(page);
  const surfaces = [
    {
      name: "onboarding",
      path: "/onboarding",
      width: 320,
      heading: "Tín hiệu từ Codex, gửi thẳng đến điện thoại.",
    },
    {
      name: "activity",
      path: "/activity",
      width: 375,
      heading: "Codex đang chờ bạn",
    },
    {
      name: "event-detail",
      path: "/activity/events/phase-9-event",
      width: 390,
      heading: event.title,
    },
    {
      name: "allowance",
      path: "/usage-limits",
      width: 430,
      heading: "Các chu kỳ đang dùng",
    },
    { name: "computer", path: "/computer", width: 320, heading: "Máy tính" },
    { name: "settings", path: "/settings", width: 375, heading: "Cài đặt" },
    {
      name: "diagnostics",
      path: "/diagnostics",
      width: 430,
      heading: "VibePing có sẵn sàng?",
    },
  ];
  const findings: string[] = [];

  for (const surface of surfaces) {
    await page.setViewportSize({ width: surface.width, height: 844 });
    await page.goto(surface.path);
    await expect(
      page.getByRole("heading", { name: surface.heading }),
    ).toBeVisible();
    await capture(page, testInfo, `${surface.width}-${surface.name}`);
    findings.push(...(await measurableFindings(page, surface.name)));

    if (surface.name === "activity") {
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
      await expect(page.getByText("Có bản VibePing mới")).toBeVisible();
      await capture(page, testInfo, `${surface.width}-update-available`);
    }

    await page.evaluate(
      () => (document.documentElement.style.fontSize = "125%"),
    );
    const stressed = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    if (stressed.scroll > stressed.client)
      findings.push(`${surface.name}: text stress overflows`);
    await expect(
      page.getByRole("heading", { name: surface.heading }),
    ).toBeVisible();
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  }

  expect(findings).toEqual([]);
});

test("recovery surfaces remain calm, actionable, and technically opaque", async ({
  page,
}, testInfo) => {
  await useExplicitProjectTheme(page, testInfo);
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
  await routeProduct(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Thông báo đang bị tắt" }),
  ).toBeVisible();
  await capture(page, testInfo, "390-permission-denied");

  await page.route("**/api/v1/computer/status", (route) =>
    route.fulfill({
      json: {
        desktop: "running",
        codex: "connected",
        allowanceReader: "available",
        notifications: "needsAttention",
        privateConnection: "ready",
        lastSignalAt: "2026-09-02T01:00:00Z",
        startedAt: "2026-09-02T00:00:00Z",
      },
    }),
  );
  await page.goto("/computer?subscription=stale");
  await expect(page.getByText("Cần đăng ký lại trên iPhone")).toBeVisible();
  await capture(page, testInfo, "390-stale-subscription");

  await page.route("**/api/v1/computer/status", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto("/computer");
  await expect(
    page.getByRole("heading", { name: "Chưa đọc được trạng thái laptop" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  await capture(page, testInfo, "390-desktop-stopped");

  await seedActivityCache(page);
  await page.route("**/api/v1/bootstrap", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("/activity?network=offline");
  await expect(
    page.getByText(
      "Đang hiển thị dữ liệu đã lưu. VibePing sẽ đồng bộ khi laptop kết nối lại.",
    ),
  ).toBeVisible();
  await capture(page, testInfo, "390-offline");

  await page.route("**/api/v1/pairing/status", (route) =>
    route.fulfill({
      json: { ...pairing, state: "pairingRequired", ownerMatch: false },
    }),
  );
  await page.route("**/api/v1/pairing/claim", (route) =>
    route.fulfill({
      status: 500,
      json: { code: "UNEXPECTED_INTERNAL_DETAIL" },
    }),
  );
  await page.goto("/onboarding?unexpected=1");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.locator("#pairing-code").fill("ABCD-EFGH");
  await page.getByRole("button", { name: "Kết nối" }).click();
  await expect(page.getByText("Đã có lỗi khi kiểm tra.")).toBeVisible();
  await expect(page.getByText("UNEXPECTED_INTERNAL_DETAIL")).toHaveCount(0);
  await capture(page, testInfo, "390-unexpected-safe-error");

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("fresh launch defaults to light even when the device prefers dark", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await routeProduct(page);

  await page.goto("/activity");

  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#f3f7f4",
  );
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
});

test("system theme, reduced motion, and keyboard focus retain usable feedback", async ({
  page,
}, testInfo) => {
  await routeProduct(page);
  const dark = testInfo.project.name.includes("dark");
  await page.emulateMedia({
    colorScheme: dark ? "dark" : "light",
    reducedMotion: "reduce",
  });
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveClass(dark ? /dark/ : /^(?!.*dark)/);
  const toggleTransition = await page
    .locator("app-toggle-switch span")
    .first()
    .evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(toggleTransition).toBe("none");

  await page.route("**/api/v1/diagnostics", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      json: {
        generatedAt: "2026-09-02T01:00:00Z",
        checks: [],
        technicalReport: "VibePing 1.0.0-rc.1",
      },
    });
  });
  await page.goto("/diagnostics?motion=reduced");
  const skeleton = page.locator(".animate-pulse").first();
  await expect(skeleton).toBeVisible();
  expect(
    await skeleton.evaluate(
      (element) => getComputedStyle(element).animationName,
    ),
  ).toBe("none");

  await page.goto("/activity?input=keyboard");
  const interactiveTags = ["A", "BUTTON", "INPUT", "SELECT", "SUMMARY"];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press("Tab");
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
  expect(focus.outline).not.toBe("none");
});
