import { expect, test, type Page } from "@playwright/test";
import {
  capture,
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

async function liveWork(page: Page): Promise<void> {
  await routeProduct(page);
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      this.setAttribute(
        "data-motion-runs",
        String(Number(this.getAttribute("data-motion-runs") ?? 0) + 1),
      );
      return animate.apply(this, args);
    };
    class TestStream extends EventTarget {
      onopen = null;
      onerror = null;
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("connected")), 10);
        window.addEventListener("alive-test-event", ((event: CustomEvent) => {
          this.dispatchEvent(
            new MessageEvent(event.detail.type, {
              data: JSON.stringify(event.detail.value),
            }),
          );
        }) as EventListener);
      }
      close(): void {
        /* isolated fixture */
      }
    }
    Object.defineProperty(window, "EventSource", { value: TestStream });
  });
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: new Date().toISOString(),
        cursor: "1",
        unreadCount: 0,
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        currentWork: {
          projectName: "VibePing",
          state: "running",
          lastTestState: "unknown",
          previewReady: false,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
}

test("real live events animate once; duplicate and hidden events remain quiet", async ({
  page,
}) => {
  await liveWork(page);
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Codex đang làm việc" }),
  ).toBeVisible();
  const card = page.locator("app-live-status-card > section");
  const event = {
    id: "alive-event",
    eventType: "codex.turn.completed",
    title: "Đã xong",
    summary: "",
    projectName: "VibePing",
    occurredAt: new Date().toISOString(),
    isRead: false,
  };
  const send = () =>
    page.evaluate(
      (value) =>
        window.dispatchEvent(
          new CustomEvent("alive-test-event", {
            detail: { type: "activity", value },
          }),
        ),
      event,
    );
  await send();
  await expect(card).toHaveAttribute("data-motion-runs", "1");
  await expect
    .poll(() => card.evaluate((element) => element.getAnimations().length))
    .toBe(0);
  await send();
  await expect(card).toHaveAttribute("data-motion-runs", "1");
  await page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(
      new CustomEvent("alive-test-event", {
        detail: { type: "activity", value: { ...value, id: "hidden-event" } },
      }),
    );
  }, event);
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
  await expect(card).toHaveAttribute("data-motion-runs", "1");
});

test("one navigation pill persists across tabs and update notice follows the user", async ({
  page,
}) => {
  await routeProduct(page);
  await page.goto("/activity");
  const pill = page.getByTestId("navigation-pill");
  await expect(pill).toBeVisible();
  await pill.evaluate((element) =>
    element.setAttribute("data-persisted", "yes"),
  );
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await navigation.getByRole("link", { name: "Máy tính" }).click();
  await expect(
    page.getByRole("heading", { name: "Đường đi tín hiệu" }),
  ).toBeVisible();
  await expect(pill).toHaveAttribute("data-persisted", "yes");
  await expect(pill).toHaveAttribute("style", /translateX\(100%\)/);
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "VERSION_READY",
          currentVersion: { hash: "old" },
          latestVersion: { hash: "new", appData: { version: "1.0.0-rc.5" } },
        },
      }),
    ),
  );
  await expect(
    page.getByText("Phiên bản 1.0.0-rc.5", { exact: true }),
  ).toBeVisible();
  await navigation.getByRole("link", { name: "Cài đặt" }).click();
  await expect(
    page.getByText("Có bản VibePing mới", { exact: true }),
  ).toBeVisible();
  await expect(pill).toHaveAttribute("data-persisted", "yes");
});

test("motion levels persist and the iPhone preference overrides all moving feedback", async ({
  page,
}) => {
  await liveWork(page);
  await page.goto("/settings");
  const levels = page.getByRole("group", { name: "Mức chuyển động" });
  await levels.getByRole("button", { name: "Vừa phải" }).click();
  await page.reload();
  await expect(
    levels.getByRole("button", { name: "Vừa phải" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/activity");
  const orbit = page.locator("app-live-status-card rect");
  await expect(orbit).toHaveCSS("animation-name", "none");
  await page.goto("/settings");
  await levels.getByRole("button", { name: "Tối đa" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "minimal");
  await expect(
    page.getByText("iPhone đang bật Giảm chuyển động.", { exact: false }),
  ).toBeVisible();
  await expect(levels.getByRole("button", { name: "Tối đa" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/activity");
  await expect(orbit).toHaveCSS("animation-name", "none");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      ),
    )
    .toBe(0);
});

test("alive status and pipeline fit phone and desktop in both themes", async ({
  page,
}, testInfo) => {
  await liveWork(page);
  await useExplicitProjectTheme(page, testInfo);
  const findings: string[] = [];
  for (const width of [320, 430, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/activity", "/computer"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await capture(page, testInfo, `alive-${width}-${path.slice(1)}`);
      findings.push(...(await measurableFindings(page, `${path}-${width}`)));
    }
  }
  expect(findings).toEqual([]);
});
