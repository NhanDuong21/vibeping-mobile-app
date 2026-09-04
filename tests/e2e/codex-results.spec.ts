import { expect, test } from "@playwright/test";
import {
  capture,
  event,
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

test("a late Codex answer enriches the open detail and activity preview without reload", async ({
  page,
}, testInfo) => {
  await routeProduct(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.addInitScript(() => {
    class Stream extends EventTarget {
      closed = false;
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("connected")), 0);
        window.addEventListener("result-fixture", ((event: CustomEvent) => {
          if (!this.closed)
            this.dispatchEvent(
              new MessageEvent("activity", {
                data: JSON.stringify(event.detail),
              }),
            );
        }) as EventListener);
      }
      close() {
        this.closed = true;
      }
    }
    Object.defineProperty(window, "EventSource", { value: Stream });
  });
  const completed = {
    ...event,
    eventType: "codex.turn.completed",
    summary: "Sửa bộ lọc hoạt động",
    resultExcerpt: undefined as string | undefined,
  };
  let result: { text: string; truncated: boolean } | undefined;
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      json: { events: [completed], nextCursor: null, unreadCount: 0 },
    }),
  );
  await page.route("**/api/v1/events/phase-9-event", (route) =>
    route.fulfill({ json: { ...completed, result, timeline: [] } }),
  );
  await page.goto("/activity/events/phase-9-event");
  await expect(
    page.getByText(/VibePing chưa có nội dung kết quả/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kết quả Codex", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(
    () => (document.documentElement.dataset["samePage"] = "yes"),
  );
  completed.resultExcerpt =
    "Đã sửa bộ lọc để giữ đúng trạng thái khi đổi trang.";
  result = {
    text: "**Đã sửa bộ lọc để giữ đúng trạng thái khi đổi trang.**\n\n## Kiểm chứng\n- Kết quả mới tự hiện trên trang đang mở.\n- Kiểm thử bộ lọc đã qua.\n\n```ts\nconst completed = true;\n```",
    truncated: true,
  };
  await page.evaluate(
    (value) =>
      window.dispatchEvent(
        new CustomEvent("result-fixture", { detail: value }),
      ),
    completed,
  );
  await expect(
    page.getByRole("heading", { name: "Kết quả Codex", exact: true }),
  ).toBeVisible();
  await expect(page.locator("app-result-body")).toContainText(
    "Kiểm thử bộ lọc đã qua.",
  );
  await expect(page.getByText(/chỉ lưu phần đầu/)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-same-page", "yes");
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Codex result")).toEqual([]);
    await capture(page, testInfo, `${width}-codex-result`);
  }
  await page.getByRole("link", { name: "Quay lại hoạt động" }).click();
  await expect(page.locator("app-activity-list")).toContainText(
    completed.resultExcerpt,
  );
  await expect(
    page.locator('a[href="/activity/events/phase-9-event"]'),
  ).toHaveCount(1);
});
