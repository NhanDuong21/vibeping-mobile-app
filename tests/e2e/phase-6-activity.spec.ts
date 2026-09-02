import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const completed = {
  id: "event-completed",
  eventType: "codex.turn.completed",
  title: "Codex đã hoàn tất",
  summary: "Công việc đã hoàn tất trên laptop.",
  projectName:
    "du-an-co-ten-rat-dai-de-kiem-tra-kha-nang-xuong-dong-tren-dien-thoai",
  occurredAt: "2026-09-02T00:01:00Z",
  isRead: false,
};

const runningWork = {
  projectName: "vibeping-mobile-app",
  state: "running",
  startedAt: "2026-09-02T00:00:00Z",
  updatedAt: "2026-09-02T00:02:00Z",
};

async function routeBootstrap(
  page: Page,
  unreadCount = 1,
  currentWork: typeof runningWork | null = runningWork,
): Promise<void> {
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({
        serverTime: "2026-09-02T00:02:00Z",
        cursor: "1",
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        currentWork,
        unreadCount,
        usageLimits: {
          state: "available",
          readAt: "2026-09-02T00:02:00Z",
          cursor: "1",
          windows: [
            {
              windowKey: "primary",
              label: "Lượt dùng 5 giờ",
              windowKind: "primary",
              remainingPercent: 18,
              durationMinutes: 300,
              resetsAt: 2_000_000_000,
              reached: false,
            },
          ],
        },
      }),
    }),
  );
}

test("mixed unread activity paginates and opens an exact detail deep link", async ({
  page,
}) => {
  await page.route("**/sw.js", (route) => route.abort());
  await routeBootstrap(page, 2);
  const permission = {
    ...completed,
    id: "event-permission",
    eventType: "codex.attention.permission_required",
    title: "Codex cần bạn xác nhận",
    summary: "Mở laptop để xem và quyết định.",
    occurredAt: "2026-09-02T00:02:00Z",
  };
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    return route.fulfill({
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(
        cursor
          ? {
              events: [{ ...completed, id: "event-old", isRead: true }],
              nextCursor: null,
              unreadCount: 2,
            }
          : {
              events: [permission, completed],
              nextCursor: "event-completed",
              unreadCount: 2,
            },
      ),
    });
  });
  await page.route("**/api/v1/events/event-permission", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(permission),
    }),
  );
  await page.route("**/api/v1/pairing/status", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({
        state: "paired",
        ownerMatch: true,
        privateIdentityReady: true,
        codeExpiresAt: null,
        csrfToken: "test-csrf",
      }),
    }),
  );
  await page.route("**/api/v1/events/event-permission/read", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ state: "read", unreadCount: 1 }),
    }),
  );

  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Codex đang làm việc" }),
  ).toBeVisible();
  await expect(page.getByText("2 mới")).toBeVisible();
  await expect(page.getByText(completed.projectName).first()).toBeVisible();
  const olderPage = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/events?") &&
      response.url().includes("cursor="),
  );
  await page.getByRole("button", { name: "Xem hoạt động cũ hơn" }).click();
  expect((await olderPage).ok()).toBe(true);
  await expect(page.locator('a[href^="/activity/events/"]')).toHaveCount(3);
  await page.getByText("Cần xác nhận").click();
  await expect(page).toHaveURL(/\/activity\/events\/event-permission$/);
  await expect(
    page.getByRole("heading", { name: "Codex cần bạn xác nhận" }),
  ).toBeVisible();
  await expect(page.getByText("Đã đọc")).toBeVisible();
});

test("SSE reconnect and duplicate delivery add one activity item", async ({
  page,
}) => {
  await page.route("**/sw.js", (route) => route.abort());
  await routeBootstrap(page, 0);
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({ events: [], nextCursor: null, unreadCount: 0 }),
    }),
  );
  await page.route("**/api/v1/stream", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: `event: activity\ndata: ${JSON.stringify(completed)}\n\n`,
    }),
  );
  await page.goto("/activity");
  await expect(page.getByText("Đã hoàn tất", { exact: true })).toHaveCount(1);
  await expect(page.getByText("1 mới")).toBeVisible();
});

test("a closed SSE stream never leaves stale current-work readiness", async ({
  page,
}) => {
  await page.route("**/sw.js", (route) => route.abort());
  await routeBootstrap(page, 0, null);
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ events: [], nextCursor: null, unreadCount: 0 }),
    }),
  );
  await page.route("**/api/v1/stream", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: `event: work\ndata: ${JSON.stringify(runningWork)}\n\n`,
    }),
  );

  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Chưa kết nối được với laptop" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Codex đang làm việc" }),
  ).toHaveCount(0);
});

test("a missing notification deep link has a calm recovery path", async ({
  page,
}) => {
  await page.goto("/activity/events/missing-event");
  await expect(
    page.getByRole("heading", { name: "Hoạt động này không còn trên laptop" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Về Hoạt động" })).toBeVisible();
});
