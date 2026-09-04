import { expect, test } from "@playwright/test";
import {
  capture,
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

test("live allowance reaches an open phone without reload and shows its exact read time", async ({
  page,
}, testInfo) => {
  await routeProduct(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.addInitScript(() => {
    class LiveStream extends EventTarget {
      closed = false;
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("connected")), 0);
        window.addEventListener("allowance-fixture", ((event: CustomEvent) => {
          if (!this.closed)
            this.dispatchEvent(
              new MessageEvent("allowance", {
                data: JSON.stringify(event.detail),
              }),
            );
        }) as EventListener);
      }
      close(): void {
        this.closed = true;
      }
    }
    Object.defineProperty(window, "EventSource", { value: LiveStream });
  });
  await page.goto("/usage-limits");
  await expect(
    page.getByRole("progressbar", { name: "Lượt dùng 5 giờ" }),
  ).toHaveAttribute("aria-valuenow", "18");
  await page.evaluate(
    () => (document.documentElement.dataset["samePage"] = "yes"),
  );
  const value = {
    state: "available",
    readAt: "2026-09-04T05:00:22Z",
    cursor: "latest",
    windows: [
      {
        windowKey: "primary",
        label: "Lượt dùng 5 giờ",
        windowKind: "primary",
        remainingPercent: 17,
        durationMinutes: 300,
        resetsAt: 2_000_000_000,
        reached: false,
      },
    ],
  };
  await page.evaluate(
    (value) =>
      window.dispatchEvent(
        new CustomEvent("allowance-fixture", { detail: value }),
      ),
    value,
  );
  await expect(
    page.getByRole("progressbar", { name: "Lượt dùng 5 giờ" }),
  ).toHaveAttribute("aria-valuenow", "17");
  await expect(page.getByText(/Đọc lần cuối:/)).toContainText(":22");
  await expect(
    page.getByText(/thử đọc hạn mức mới từ Codex khoảng mỗi 15 giây/),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-same-page", "yes");
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await capture(page, testInfo, `${width}-live-allowance`);
    expect(await measurableFindings(page, "live allowance")).toEqual([]);
  }
});
