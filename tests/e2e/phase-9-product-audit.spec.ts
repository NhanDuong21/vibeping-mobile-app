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
    await expect
      .poll(() =>
        logo.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBeGreaterThanOrEqual(40);
    const image = await logo.evaluate((element: HTMLImageElement) => ({
      complete: element.complete,
      currentPath: new URL(element.currentSrc, element.ownerDocument.baseURI)
        .pathname,
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
      heading: "Codex đang chờ bạn",
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

test("refined surfaces fit every required phone width", async ({
  page,
}, testInfo) => {
  await useExplicitProjectTheme(page, testInfo);
  await routeProduct(page);
  const widths = [320, 375, 390, 430];
  const surfaces = [
    { name: "activity", path: "/activity" },
    { name: "event-detail", path: "/activity/events/phase-9-event" },
    { name: "computer", path: "/computer" },
    { name: "settings", path: "/settings" },
  ];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    for (const surface of surfaces) {
      await page.goto(surface.path);
      const widthMetrics = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(
        widthMetrics.scroll,
        `${surface.name} overflows at ${width}px`,
      ).toBeLessThanOrEqual(widthMetrics.client);
    }
  }
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
  await expect(
    page.getByText("Điện thoại cần bật lại thông báo"),
  ).toBeVisible();
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
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      get: () => "granted" as NotificationPermission,
    });
  });
  await page.emulateMedia({
    colorScheme: dark ? "dark" : "light",
    reducedMotion: "reduce",
  });
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
          state: "running",
          lastTestState: "unknown",
          previewReady: false,
          startedAt: "2026-09-02T00:50:00Z",
          updatedAt: "2026-09-02T01:00:00Z",
          freshUntil: new Date(Date.now() + 120_000).toISOString(),
        },
        usageLimits: {
          state: "available",
          readAt: null,
          windows: [],
          cursor: "1",
        },
      },
    }),
  );
  await page.goto("/activity?motion=reduced");
  await expect(
    page.getByRole("heading", { name: "Codex đang làm việc" }),
  ).toBeVisible();
  expect(
    await page
      .locator("app-live-status-card rect")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).animationName),
      ),
  ).toEqual(["none"]);
  await expect(page.locator("app-live-status-card .h-0\\.5 span")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator("app-live-status-card")).not.toContainText(/\d+%/);

  await page.goto("/settings");
  await expect(page.locator("html")).toHaveClass(dark ? /dark/ : /^(?!.*dark)/);
  await expect(
    page.getByRole("button", { name: "Bật lại thông báo" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xem cách bật lại" }),
  ).toHaveCount(0);
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
  await expect(page.locator("app-activity-list")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeVisible();
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
