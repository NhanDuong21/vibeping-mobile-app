import { expect, test } from "@playwright/test";
import type { components } from "../../contracts/generated/api";
import {
  measurableFindings,
  routeProduct,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";

type Turn = components["schemas"]["ActivityEventDetail"];
test.use({ serviceWorkers: "block" });

test("legacy review output is quiet in the feed and retained in the answer", async ({
  page,
}, testInfo) => {
  await routeProduct(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const legacy = {
    id: "legacy-review",
    eventType: "codex.turn.completed",
    title: "Công việc",
    summary: "verdict: recapture",
    resultExcerpt:
      "disposition: ship\nNo separate quality-bar card was supplied.",
    projectName: "fixture-project",
    occurredAt: new Date().toISOString(),
    isRead: true,
    result: {
      text: "disposition: ship\n\nNo separate quality-bar card was supplied.\n\nNội dung gốc được giữ nguyên.",
      truncated: false,
    },
    timeline: [
      { eventType: "codex.turn.stopped", occurredAt: new Date().toISOString() },
    ],
  };
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      json: { events: [legacy], nextCursor: null, unreadCount: 0 },
    }),
  );
  await page.route("**/api/v1/events/legacy-review", (route) =>
    route.fulfill({ json: legacy }),
  );
  await page.goto("/activity");
  const row = page.locator(
    'app-activity-list a[href="/activity/events/legacy-review"]',
  );
  await expect(row).toContainText("Đã có kết quả từ Codex");
  await expect(row).not.toContainText("disposition");
  await expect(row).not.toContainText("verdict");
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.impeccable/review/work-details/${testInfo.project.name}-legacy-feed.png`,
  });
  await row.click();
  await expect(page.locator("app-event-detail-page")).toContainText(
    "Công việc VibePing ·",
  );
  await expect(page.locator("app-event-detail-page")).toContainText(
    "Yêu cầu đã dừng",
  );
  await expect(page.locator("app-result-body")).toContainText(
    "disposition: ship",
  );
  await expect(page.locator("app-result-body")).toContainText(
    "No separate quality-bar card was supplied.",
  );
  await expect(page.locator("app-result-body")).toContainText(
    "Nội dung gốc được giữ nguyên.",
  );
  await expect(page.locator("app-activity-page")).toBeHidden();
  await page.screenshot({
    path: `.impeccable/review/work-details/${testInfo.project.name}-legacy-detail.png`,
  });
});

test("two-level work feed, inline requests, live result, exact notification and offline cache", async ({
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
      : "disposition: ship\nNo separate quality-bar card was supplied.\nĐã giữ nguyên kết quả và nhóm đúng các yêu cầu. Các chi tiết khác ở đây.",
    result: running
      ? undefined
      : {
          text: `# Kết quả yêu cầu ${number}\n\ndisposition: ship\n\n- Không mất lịch sử.\n- Câu trả lời đầy đủ vẫn được giữ lại.\n\n\`\`\`text\nNội dung gốc ${thread}-${number}\n\`\`\``,
          truncated: false,
        },
    timeline: running ? timeline.slice(0, 1) : timeline,
    session: {
      eventIds: [`${thread}-${number}`, `notification-${thread}-${number}`],
      state: running ? "running" : "completed",
      taskLabel: `Hoàn thiện màn hoạt động trên điện thoại ${number}`,
      startedAt: number === 1 ? null : start,
      completedAt: running ? null : at,
      updatedAt: at,
      failedTestCount: 1,
      lastTestState: "passed",
      timeline: running ? timeline.slice(0, 1) : timeline.slice(-3),
      thread: {
        id: thread,
        title: `Hoàn thiện công việc ${thread} và lịch sử làm việc trên điện thoại`,
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
  const detailReads: string[] = [];
  let firstPageOnly = false;
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
          ? turns
              .filter((turn) => turn.session?.thread?.id === thread)
              .slice(0, firstPageOnly ? 1 : undefined)
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
    detailReads.push(id);
    return route.fulfill({ json: turns.find((turn) => turn.id === id) });
  });
  await page.goto("/activity");
  const visiblePage = () =>
    page.locator("ion-router-outlet > .ion-page:not(.ion-page-hidden)").last();
  const hero = page.locator('app-live-status-card [data-thread-id="a"]');
  await expect(hero).toBeVisible();
  await expect(page.locator('[data-thread-id="a"]')).toHaveCount(1);
  await expect(hero).toContainText("Yêu cầu thứ 3");
  await expect(page.locator("app-live-status-card")).toContainText(
    "Còn 1 công việc khác",
  );
  await expect(page.locator('[data-thread-id="b"]')).toHaveCount(1);
  await expect(page.locator("app-activity-list")).not.toContainText(
    "Cần chú ý",
  );
  await expect(
    page.locator('app-activity-list [data-thread-id="b"]'),
  ).not.toContainText("disposition");
  await expect(
    page.locator('app-activity-list [data-thread-id="b"]'),
  ).not.toContainText("Xem công việc");
  for (const width of [320, 375, 430, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "Thread feed")).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/work-details/${testInfo.project.name}-${width}-feed.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await hero.click();
  await expect(visiblePage()).toContainText("Chi tiết công việc");
  const request = (id: string) =>
    visiblePage().locator(`[data-request-id="${id}"]`);
  await expect(request("a-3").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(request("a-2").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(request("a-2").locator("app-request-content")).toHaveCount(0);
  expect(detailReads).not.toContain("a-2");
  await expect(page.locator("app-activity-page")).toBeHidden();
  await expect(visiblePage()).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: `.impeccable/review/work-details/${testInfo.project.name}-working.png`,
  });
  await request("a-2").getByRole("button").click();
  await expect(page).toHaveURL(/\/activity\/sessions\/a$/);
  await expect(request("a-2").locator("app-result-body")).toContainText(
    "Câu trả lời đầy đủ vẫn được giữ lại.",
  );
  await expect(request("a-2").locator("details")).not.toHaveAttribute("open");
  await expect(request("a-2").locator("app-timeline-marker")).toHaveCount(4);
  await expect(
    request("a-2").getByRole("heading", {
      name: "Kết quả yêu cầu 2",
      exact: true,
    }),
  ).toBeVisible();
  await expect(request("a-2").locator("pre")).toContainText("Nội dung gốc a-2");
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await request("a-2").evaluate((el) =>
      el.scrollIntoView({ block: "start" }),
    );
    expect(await measurableFindings(page, "Inline request detail")).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/work-details/${testInfo.project.name}-${width}-expanded.png`,
    });
  }
  await request("a-1").getByRole("button").click();
  await expect(request("a-1").locator("app-result-body")).toContainText(
    "Nội dung gốc a-1",
  );
  await expect(request("a-2").locator("app-result-body")).toContainText(
    "Nội dung gốc a-2",
  );
  await request("a-1").getByRole("button").click();
  await expect(request("a-1").locator("app-request-content")).toHaveCount(0);
  await request("a-2").getByRole("button").click();
  await request("a-2").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.screenshot({
    path: `.impeccable/review/work-details/${testInfo.project.name}-collapsed.png`,
  });
  turns[0] = makeTurn("a", 3, 3);
  feed[0] = turns[0];
  await page.evaluate(
    (event) =>
      window.dispatchEvent(new CustomEvent("thread-signal", { detail: event })),
    turns[0],
  );
  await expect(request("a-3").locator("app-result-body")).toContainText(
    "Nội dung gốc a-3",
  );
  await expect(
    request("a-3").locator("app-session-working-signal"),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await visiblePage()
    .locator("app-pull-to-refresh")
    .evaluate((el) => {
      el.scrollTop = 0;
    });
  await page.screenshot({
    path: `.impeccable/review/work-details/${testInfo.project.name}-completed.png`,
  });
  await visiblePage().getByRole("link", { name: "Quay lại hoạt động" }).click();
  const row = page.locator('app-activity-page [data-thread-id="b"]');
  await row.scrollIntoViewIfNeeded();
  const before = await page
    .locator("app-activity-page app-pull-to-refresh")
    .evaluate((element) => element.scrollTop);
  await row.click();
  await expect(visiblePage()).toContainText("Chi tiết công việc");
  await expect(visiblePage().locator("app-result-body")).toContainText(
    "Nội dung gốc b-1",
  );
  await expect(visiblePage()).not.toContainText("Yêu cầu gần nhất");
  await expect(visiblePage()).not.toContainText("1 yêu cầu");
  await expect(visiblePage()).not.toContainText("trong 1");
  await expect(page.locator("app-activity-page")).toBeHidden();
  await expect(visiblePage()).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: `.impeccable/review/work-details/${testInfo.project.name}-single.png`,
  });
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
  await expect(hero).toContainText("Yêu cầu thứ 4");
  await expect(
    page.locator('app-activity-page [data-thread-id="a"]'),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page.locator('app-activity-page [data-thread-id="a"]'),
  ).toHaveCount(1);
  // A notification must include its exact request even outside the most recent page.
  firstPageOnly = true;
  await page.goto("/activity/events/notification-a-2");
  await expect(page).toHaveURL(/\/activity\/sessions\/a\?request=a-2$/);
  await expect(request("a-2").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(request("a-2").locator("app-result-body")).toContainText(
    "Không mất lịch sử.",
  );
  await expect(
    visiblePage().getByRole("link", { name: "Quay lại hoạt động" }),
  ).toHaveAttribute("href", "/activity");
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.reload();
  await expect(request("a-2").locator("app-result-body")).toContainText(
    "Nội dung gốc a-2",
  );
  await expect(request("a-2")).toContainText("Đang hiển thị nội dung đã lưu");
  await page.unroute("**/api/v1/**");
  firstPageOnly = false;
  // Once every work completes, the large hero gives way to a compact idle status.
  turns = turns.map((turn) =>
    makeTurn(
      turn.session!.thread!.id,
      turn.session!.thread!.turnNumber,
      turn.session!.thread!.turnCount,
    ),
  );
  feed = [
    turns[0],
    turns.find((turn) => turn.id === "b-1")!,
    turns.find((turn) => turn.id === "c-1")!,
  ];
  await page.goto("/activity");
  await expect(page.locator("app-live-status-card")).toContainText(
    "Codex đang nghỉ",
  );
  await expect(
    page.locator("app-live-status-card app-work-session-card"),
  ).toHaveCount(0);
  await expect(
    page.locator('app-activity-list [data-thread-id="a"]'),
  ).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await measurableFindings(page, "Idle work feed")).toEqual([]);
  await page.screenshot({
    path: `.impeccable/review/work-details/${testInfo.project.name}-idle.png`,
  });
});
