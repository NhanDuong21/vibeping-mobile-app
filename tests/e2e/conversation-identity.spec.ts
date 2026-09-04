import { expect, test } from "@playwright/test";
import type { components } from "../../contracts/generated/api";
import {
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

type Request = components["schemas"]["ActivityEventDetail"];
test.use({ serviceWorkers: "block" });

test("verified child works fold into the main conversation, keeping results, old links and offline data", async ({
  page,
}, testInfo) => {
  await routeProduct(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    class Stream extends EventTarget {
      closed = false;
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("connected")), 0);
        window.addEventListener("identity-reconciled", () => {
          if (!this.closed)
            this.dispatchEvent(new MessageEvent("activity", { data: "{}" }));
        });
      }
      close() {
        this.closed = true;
      }
    }
    Object.defineProperty(window, "EventSource", { value: Stream });
  });
  const at = new Date().toISOString();
  function request(id: string, title: string): Request {
    return {
      id,
      eventType: "codex.turn.completed",
      title: "Công việc",
      summary: "Đã có kết quả",
      resultExcerpt: `Đã hoàn tất ${title}.`,
      projectName: "cung-du-an",
      occurredAt: at,
      isRead: true,
      result: {
        text: `# ${title}\n\nKết quả nguyên bản ${id}.\n\n- Lịch sử được giữ lại.`,
        truncated: false,
      },
      timeline: [{ eventType: "codex.turn.completed", occurredAt: at }],
      session: {
        eventIds: [id, `notification-${id}`],
        state: "completed",
        startedAt: at,
        completedAt: at,
        updatedAt: at,
        failedTestCount: 0,
        lastTestState: "passed",
        timeline: [],
        thread: {
          id: id === "main" ? "root" : id,
          title,
          turnCount: 1,
          turnNumber: 1,
          turnIds: [id],
          latestTurnId: id,
          previousTurnId: null,
          nextTurnId: null,
          firstSignalAt: at,
          startedAt: at,
          updatedAt: at,
          failedTestCount: 0,
          isRead: true,
        },
      },
    };
  }
  const main = request("main", "Hoàn thiện công việc chính");
  const child = request("child", "Công việc hỗ trợ");
  const separate = request("separate", "Một đoạn chat khác");
  let grouped = false;
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: at,
        cursor: "1",
        unreadCount: 0,
        currentWork: null,
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        usageLimits: {
          state: "available",
          readAt: at,
          windows: [],
          cursor: "1",
        },
      },
    }),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) => {
    const thread = new URL(route.request().url()).searchParams.get("thread");
    return route.fulfill({
      json: {
        events: thread
          ? grouped
            ? [main, child]
            : [main, child, separate].filter(
                (event) => event.session?.thread?.id === thread,
              )
          : grouped
            ? [main, separate]
            : [main, child, separate],
        nextCursor: null,
        unreadCount: 0,
      },
    });
  });
  await page.route(/\/api\/v1\/events\/[^/?]+$/, (route) => {
    const id = new URL(route.request().url()).pathname
      .split("/")
      .at(-1)!
      .replace("notification-", "");
    return route.fulfill({
      json: [main, child, separate].find((event) => event.id === id),
    });
  });
  await page.goto("/activity");
  await expect(page.locator('[data-thread-id="child"]')).toHaveCount(1);
  // Read the old child result first so reconciliation must preserve a real cached answer.
  await page.goto("/activity/events/notification-child");
  await expect(page.locator("app-result-body")).toContainText(
    "Kết quả nguyên bản child.",
  );
  await page
    .getByRole("link", { name: "Quay lại hoạt động", exact: true })
    .click();
  main.session!.thread!.turnCount = 2;
  main.session!.thread!.turnIds = ["main", "child"];
  child.session!.thread = {
    ...main.session!.thread!,
    turnNumber: 2,
    previousTurnId: "main",
  };
  grouped = true;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("identity-reconciled")),
  );
  await expect(page.locator('[data-thread-id="root"]')).toHaveCount(1);
  await expect(page.locator('[data-thread-id="child"]')).toHaveCount(0);
  await expect(page.locator('[data-thread-id="separate"]')).toHaveCount(1);
  await expect(page.locator('[data-thread-id="root"]')).toContainText(
    "2 yêu cầu",
  );
  for (const width of [320, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Conversation feed")).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/conversation-identity/${testInfo.project.name}-${width}-feed.png`,
    });
  }
  // Previously saved child-work URLs still resolve to the canonical conversation.
  await page.goto("/activity/sessions/child");
  await expect(page).toHaveURL(/\/activity\/sessions\/root$/);
  const detail = page.locator("app-thread-detail-page");
  const mainPanel = detail.locator('[data-request-id="main"]');
  const childPanel = detail.locator('[data-request-id="child"]');
  await expect(detail.getByRole("heading", { level: 1 })).toHaveText(
    "Hoàn thiện công việc chính",
  );
  await expect(mainPanel.getByRole("button").first()).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(childPanel.getByRole("button").first()).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(mainPanel.locator("app-result-body")).toContainText(
    "Kết quả nguyên bản main.",
  );
  for (const width of [320, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Conversation detail")).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/conversation-identity/${testInfo.project.name}-${width}-detail.png`,
    });
  }
  await childPanel.getByRole("button").first().click();
  await expect(childPanel.locator("app-result-body")).toContainText(
    "Kết quả nguyên bản child.",
  );
  await page.route("**/api/**", (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.locator("app-thread-detail-page")).toContainText(
    "Đang hiển thị công việc đã lưu",
  );
  await expect(
    page.locator('[data-request-id="main"] app-result-body'),
  ).toContainText("Kết quả nguyên bản main.");
  await page.unroute("**/api/**");
  await page.goto("/activity/events/notification-child");
  await expect(page).toHaveURL(/\/activity\/sessions\/root\?request=child$/);
  await expect(
    page.locator('[data-request-id="child"] app-result-body'),
  ).toContainText("Kết quả nguyên bản child.");
  // Keep the shell reachable while simulating a disconnected API, as an installed PWA does.
  await page.route("**/api/**", (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.locator("app-thread-detail-page")).toContainText(
    "Đang hiển thị công việc đã lưu",
  );
  await expect(
    page.locator('[data-request-id="main"] app-result-body'),
  ).toContainText("Kết quả nguyên bản main.");
  await expect(
    page.locator('[data-request-id="child"] app-result-body'),
  ).toContainText("Kết quả nguyên bản child.");
});
