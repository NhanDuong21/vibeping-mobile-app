import { expect, test } from "@playwright/test";
import type { components } from "../../contracts/generated/api";
import {
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

type Turn = components["schemas"]["ActivityEventDetail"];
test.use({ serviceWorkers: "block" });

test("thread feed, live turn, exact notification target, siblings and retained scroll", async ({
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
        window.addEventListener("thread-signal", ((event: CustomEvent) => {
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
  const at = new Date().toISOString();
  const start = new Date(Date.now() - 18 * 60_000).toISOString();
  const timeline = [
    { eventType: "codex.turn.started", occurredAt: start },
    {
      eventType: "codex.test.failed",
      occurredAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    },
    {
      eventType: "codex.test.passed",
      occurredAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    },
    { eventType: "codex.turn.completed", occurredAt: at },
  ];
  const makeTurn = (
    thread: string,
    number: number,
    total: number,
    running = false,
  ): Turn => ({
    id: `${thread}-${number}`,
    eventType: running ? "codex.turn.started" : "codex.turn.completed",
    title: "Công việc",
    summary: "Mở Codex trên laptop để xem kết quả",
    projectName:
      "vibeping-mobile-app-ten-du-an-rat-dai-de-kiem-tra-tren-iphone",
    occurredAt: at,
    isRead: true,
    resultExcerpt: running
      ? undefined
      : "Đã giữ nguyên kết quả và nhóm đúng các lượt. Các chi tiết khác ở đây.",
    result: running
      ? undefined
      : {
          text: "Đã giữ nguyên kết quả và nhóm đúng các lượt.\n\n- Không mất lịch sử.\n- Câu trả lời đầy đủ vẫn được giữ lại.",
          truncated: false,
        },
    timeline: running ? timeline.slice(0, 1) : timeline,
    session: {
      eventIds: [`${thread}-${number}`, `notification-${thread}-${number}`],
      state: running ? "running" : "completed",
      taskLabel: `Hoàn thiện màn hoạt động và các lượt làm việc ${number}`,
      startedAt: number === 1 ? null : start,
      completedAt: running ? null : at,
      updatedAt: at,
      failedTestCount: 1,
      lastTestState: "passed",
      timeline: running ? timeline.slice(0, 1) : timeline.slice(-3),
      thread: {
        id: thread,
        title: `Hoàn thiện phiên ${thread} và lịch sử làm việc trên điện thoại`,
        turnCount: total,
        turnNumber: number,
        latestTurnId: `${thread}-${total}`,
        previousTurnId: number > 1 ? `${thread}-${number - 1}` : null,
        nextTurnId: number < total ? `${thread}-${number + 1}` : null,
        firstSignalAt: start,
        startedAt: start,
        updatedAt: at,
        failedTestCount: total,
        isRead: true,
      },
    },
  });
  let turns = [
    makeTurn("a", 3, 3, true),
    makeTurn("a", 2, 3),
    makeTurn("a", 1, 3),
    makeTurn("b", 1, 1),
    makeTurn("c", 1, 1, true),
  ];
  // A updates most recently; c is another simultaneously working thread in the same repository.
  turns[4].session!.updatedAt = new Date(Date.now() - 30_000).toISOString();
  turns[4].session!.thread!.updatedAt = turns[4].session!.updatedAt;
  let feed = [turns[0], turns[3], turns[4]];
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
    const params = new URL(route.request().url()).searchParams;
    const thread = params.get("thread");
    return route.fulfill({
      json: {
        events: thread
          ? turns.filter((turn) => turn.session?.thread?.id === thread)
          : feed,
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
    return route.fulfill({ json: turns.find((turn) => turn.id === id) });
  });
  await page.goto("/activity");
  const visiblePage = () =>
    page.locator("ion-router-outlet > .ion-page:not(.ion-page-hidden)").last();
  const hero = page.locator('app-live-status-card [data-thread-id="a"]');
  await expect(hero).toBeVisible();
  await expect(page.locator('[data-thread-id="a"]')).toHaveCount(1);
  await expect(hero).toContainText("3 lượt làm việc");
  await expect(page.locator("app-live-status-card")).toContainText(
    "Còn 1 phiên khác",
  );
  await expect(page.locator('[data-thread-id="b"]')).toHaveCount(1);
  await expect(page.locator("app-activity-list")).not.toContainText(
    "Cần chú ý",
  );
  for (const width of [320, 375, 430, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Thread feed")).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/thread-sessions/${testInfo.project.name}-${width}-feed.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await hero.click();
  await expect(visiblePage()).toContainText("Chi tiết phiên làm việc");
  await expect(
    page.getByRole("heading", { name: "Lượt hiện tại", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-turn-id]")).toHaveCount(2);
  await expect(page.locator("app-activity-page")).toBeHidden();
  await expect(visiblePage()).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: `.impeccable/review/thread-sessions/${testInfo.project.name}-session.png`,
  });
  await page.locator('[data-turn-id="a-2"]').click();
  await expect(visiblePage()).toContainText("Lượt 2 trong 3");
  await expect(visiblePage().locator("app-result-body")).toContainText(
    "Câu trả lời đầy đủ vẫn được giữ lại.",
  );
  await expect(visiblePage().locator("details")).not.toHaveAttribute("open");
  await expect(visiblePage().locator("app-timeline-marker")).toHaveCount(4);
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Turn detail")).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/thread-sessions/${testInfo.project.name}-${width}-turn.png`,
    });
  }
  await visiblePage()
    .getByRole("link", { name: "← Lượt trước", exact: true })
    .click();
  await expect(visiblePage()).toContainText("Lượt 1 trong 3");
  await expect(
    visiblePage().getByRole("link", { name: "← Lượt trước", exact: true }),
  ).toHaveCount(0);
  await expect(visiblePage()).toContainText("Không ghi nhận");
  await visiblePage()
    .getByRole("link", { name: "Lượt sau →", exact: true })
    .click();
  await expect(visiblePage()).toContainText("Lượt 2 trong 3");
  await visiblePage()
    .getByRole("link", { name: "Quay lại phiên làm việc" })
    .click();
  await expect(visiblePage()).toContainText("Chi tiết phiên làm việc");
  turns[0] = makeTurn("a", 3, 3);
  feed[0] = turns[0];
  await page.evaluate(
    (event) =>
      window.dispatchEvent(new CustomEvent("thread-signal", { detail: event })),
    turns[0],
  );
  await expect(
    visiblePage().getByRole("heading", { name: "Lượt hiện tại", exact: true }),
  ).toHaveCount(0);
  await expect(visiblePage().locator("[data-turn-id]")).toHaveCount(3);
  await visiblePage().getByRole("link", { name: "Quay lại hoạt động" }).click();
  const row = page.locator('app-activity-page [data-thread-id="b"]');
  await row.scrollIntoViewIfNeeded();
  const before = await page
    .locator("app-activity-page app-pull-to-refresh")
    .evaluate((element) => element.scrollTop);
  await row.click();
  await visiblePage().getByRole("link", { name: "Quay lại hoạt động" }).click();
  await expect
    .poll(() =>
      page
        .locator("app-activity-page app-pull-to-refresh")
        .evaluate((element) => element.scrollTop),
    )
    .toBe(before);
  turns = [makeTurn("a", 4, 4, true), ...turns];
  feed = [turns[0], ...feed.filter((turn) => turn.session?.thread?.id !== "a")];
  for (let repeat = 0; repeat < 2; repeat++) {
    await page.evaluate(
      (event) =>
        window.dispatchEvent(
          new CustomEvent("thread-signal", { detail: event }),
        ),
      turns[0],
    );
  }
  await expect(hero).toContainText("4 lượt làm việc");
  await expect(
    page.locator('app-activity-page [data-thread-id="a"]'),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page.locator('app-activity-page [data-thread-id="a"]'),
  ).toHaveCount(1);
  await page.goto("/activity/events/notification-a-2");
  await expect(visiblePage()).toContainText("Lượt 2 trong 3");
  await expect(visiblePage().locator("app-result-body")).toContainText(
    "Không mất lịch sử.",
  );
  await expect(
    visiblePage().getByRole("link", { name: "Quay lại phiên làm việc" }),
  ).toHaveAttribute("href", "/activity/sessions/a");
});
