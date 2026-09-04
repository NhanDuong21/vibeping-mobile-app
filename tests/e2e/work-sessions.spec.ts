import { expect, test } from "@playwright/test";
import type { components } from "../../contracts/generated/api";
import {
  capture,
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

test.use({ serviceWorkers: "block" });

test("one card follows a session through completion, keeps its answer and opens a full timeline", async ({
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
        window.addEventListener("session-fixture", ((event: CustomEvent) => {
          if (!this.closed)
            this.dispatchEvent(
              new MessageEvent(event.detail.type, {
                data: JSON.stringify(event.detail.value),
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
  const started = new Date(Date.now() - 18 * 60_000).toISOString();
  const at = new Date().toISOString();
  const timeline = [
    { eventType: "codex.turn.started", occurredAt: started },
    {
      eventType: "codex.test.failed",
      occurredAt: new Date(Date.now() - 7 * 60_000).toISOString(),
    },
    { eventType: "codex.turn.resumed", occurredAt: at },
  ];
  const session: components["schemas"]["ActivityEventDetail"] = {
    id: "session-fixture",
    eventType: "codex.turn.started",
    title: "Bắt đầu",
    summary: "Tinh chỉnh chuyển động toàn ứng dụng",
    projectName: "vibeping-mobile-app",
    occurredAt: at,
    isRead: false,
    timeline,
    session: {
      eventIds: ["legacy-completion"],
      state: "running",
      startedAt: started,
      completedAt: null,
      updatedAt: at,
      failedTestCount: 1,
      timeline: [...timeline],
    },
  };
  const previous = {
    ...session,
    id: "earlier-session",
    summary: "Sửa bộ lọc hoạt động",
    occurredAt: started,
    session: { ...session.session!, state: "completed", completedAt: started },
  };
  const work = {
    sessionId: session.id,
    projectName: session.projectName,
    state: "running",
    lastTestState: "failed",
    previewReady: false,
    startedAt: started,
    updatedAt: at,
    freshUntil: new Date(Date.now() + 120_000).toISOString(),
  };
  const bootstrap = {
    serverTime: at,
    cursor: "1",
    unreadCount: 1,
    connection: {
      desktop: "running",
      codex: "ready",
      privateConnection: "local",
    },
    currentWork: work as typeof work | null,
    usageLimits: { state: "available", readAt: at, windows: [], cursor: "1" },
  };
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({ json: bootstrap }),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      json: { events: [session, previous], nextCursor: null, unreadCount: 1 },
    }),
  );
  await page.route("**/api/v1/events/session-fixture", (route) =>
    route.fulfill({ json: session }),
  );
  await page.route("**/api/v1/events/session-fixture/read*", (route) =>
    route.fulfill({ json: { state: "read", unreadCount: 0 } }),
  );
  await page.goto("/activity");
  const card = page.locator('[data-session-id="session-fixture"]');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Đang làm việc");
  await expect(card).toContainText("Codex tiếp tục xử lý");
  await card.evaluate((element) =>
    element.setAttribute("data-same-card", "yes"),
  );
  for (const width of [320, 430, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Working session")).toEqual([]);
    await capture(page, testInfo, `${width}-session-running`);
  }
  session.eventType = "codex.turn.completed";
  session.session!.state = "completed";
  session.session!.completedAt = at;
  timeline.push({ eventType: "codex.turn.completed", occurredAt: at });
  session.session!.timeline = timeline.slice(-3);
  session.resultExcerpt =
    "Đã tinh chỉnh chuyển động. Kiểm thử giao diện đã qua.";
  session.result = {
    text: `${session.resultExcerpt}\n\n- Thẻ phiên giữ nguyên khi hoàn tất.\n- Chuyển động tuân theo cài đặt giảm chuyển động.`,
    truncated: false,
  };
  bootstrap.currentWork = null;
  await page.evaluate((value) => {
    window.dispatchEvent(
      new CustomEvent("session-fixture", {
        detail: { type: "work", value: null },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("session-fixture", {
        detail: { type: "activity", value },
      }),
    );
  }, session);
  await expect(card).toContainText("Đã hoàn tất");
  await expect(card).toContainText("18 phút");
  await expect(card).toContainText("1 lần kiểm thử chưa đạt");
  await expect(card).toHaveAttribute("data-same-card", "yes");
  await expect(card).toHaveCount(1);
  await page.setViewportSize({ width: 430, height: 844 });
  await capture(page, testInfo, "430-session-completed");
  await card.click();
  await expect(
    page.getByRole("heading", { name: "Diễn biến", exact: true }),
  ).toBeVisible();
  await expect(page.locator("app-event-detail-page")).toContainText(
    "Codex tiếp tục xử lý",
  );
  await expect(page.locator("app-result-body")).toContainText(
    "Thẻ phiên giữ nguyên khi hoàn tất.",
  );
  await expect(page.locator("details")).not.toHaveAttribute("open");
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Session detail")).toEqual([]);
    await capture(page, testInfo, `${width}-session-detail`);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("app-result-body").scrollIntoViewIfNeeded();
  await capture(page, testInfo, "430-session-result");
  await page.getByRole("link", { name: "Quay lại hoạt động" }).click();
  expect(
    await card.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.reload();
  await expect(card).toContainText("Đã tinh chỉnh chuyển động.");
  await card.click();
  await expect(page.locator("app-result-body")).toContainText(
    "Thẻ phiên giữ nguyên khi hoàn tất.",
  );
});
