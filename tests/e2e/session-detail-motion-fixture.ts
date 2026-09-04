import type { Page } from "@playwright/test";
import type { components } from "../../contracts/generated/api";
import { routeProduct } from "./phase-9-product-fixture";

export async function routeWorkingDetail(page: Page) {
  await routeProduct(page);
  await page.addInitScript(() => {
    class Stream extends EventTarget {
      closed = false;
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("connected")), 0);
        window.addEventListener("detail-signal", ((event: CustomEvent) => {
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
  const started = new Date(Date.now() - 14 * 60_000).toISOString();
  const session: components["schemas"]["ActivityEventDetail"] = {
    id: "detail-motion-session",
    eventType: "codex.turn.resumed",
    title: "Tiếp tục",
    summary: "Tinh chỉnh chuyển động trong chi tiết hoạt động",
    projectName: "vibeping-mobile-app",
    occurredAt: at,
    isRead: true,
    timeline: [
      { eventType: "codex.turn.started", occurredAt: started },
      {
        eventType: "codex.test.failed",
        occurredAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      },
      { eventType: "codex.turn.resumed", occurredAt: at },
    ],
    session: {
      eventIds: ["detail-motion-session"],
      state: "running",
      startedAt: started,
      completedAt: null,
      updatedAt: at,
      failedTestCount: 1,
      timeline: [],
    },
  };
  const usage = { state: "available", readAt: at, windows: [], cursor: "1" };
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: at,
        cursor: "1",
        unreadCount: 0,
        connection: {
          desktop: "running",
          codex: "ready",
          privateConnection: "local",
        },
        currentWork: session.session?.completedAt
          ? null
          : {
              sessionId: session.id,
              projectName: session.projectName,
              state: session.session?.state,
              lastTestState: "failed",
              previewReady: false,
              startedAt: started,
              updatedAt: session.session?.updatedAt,
              freshUntil: new Date(
                Date.parse(session.session!.updatedAt) + 120_000,
              ).toISOString(),
            },
        usageLimits: usage,
      },
    }),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        events: [
          {
            ...session,
            session: { ...session.session!, timeline: session.timeline },
          },
        ],
        nextCursor: null,
        unreadCount: 0,
      },
    }),
  );
  await page.route("**/api/v1/events/detail-motion-session", (route) =>
    route.fulfill({ json: session }),
  );
  await page.route("**/api/v1/events/detail-motion-session/read*", (route) =>
    route.fulfill({ json: { state: "read", unreadCount: 0 } }),
  );
  await page.route("**/api/v1/personal/projects", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/personal/rules", (route) =>
    route.fulfill({
      json: { completionMinMinutes: 2, waitingReminderMinutes: 5 },
    }),
  );
  await page.route("**/api/v1/usage-limits", (route) =>
    route.fulfill({ json: usage }),
  );
  let revision = 0;
  return {
    session,
    async state(state: string) {
      session.session!.state = state;
      session.session!.updatedAt = new Date(
        Date.now() + ++revision,
      ).toISOString();
      session.session!.completedAt = [
        "completed",
        "failed",
        "stopped",
      ].includes(state)
        ? session.session!.updatedAt
        : null;
      session.eventType =
        state === "completed" ? "codex.turn.completed" : "codex.turn.resumed";
      if (state === "completed") {
        session.result = {
          text: "Đã hoàn tất. Câu trả lời cuối vẫn được giữ nguyên.",
          truncated: false,
        };
        session.resultExcerpt = session.result.text;
        session.timeline.push({
          eventType: session.eventType,
          occurredAt: session.session!.updatedAt,
        });
      }
      await page.evaluate(
        (value) =>
          window.dispatchEvent(
            new CustomEvent("detail-signal", { detail: value }),
          ),
        session,
      );
    },
  };
}
