import { expect, test, type Page } from "@playwright/test";

const cachedEvent = {
  id: "event-cached",
  eventType: "codex.turn.completed",
  title: "Codex đã hoàn tất",
  summary: "Công việc đã hoàn tất trên laptop.",
  projectName: "vibeping-offline",
  occurredAt: "2026-09-02T00:01:00Z",
  isRead: false,
};

async function seedCache(page: Page): Promise<void> {
  await page.evaluate(async (event) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open("vibeping-mobile", 2);
      opening.onupgradeneeded = () => {
        if (!opening.result.objectStoreNames.contains("activity-feed")) {
          opening.result.createObjectStore("activity-feed");
        }
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    await new Promise<void>((resolve, reject) => {
      const writing = database
        .transaction("activity-feed", "readwrite")
        .objectStore("activity-feed")
        .put(
          {
            savedAt: "2026-01-01T00:00:00Z",
            currentWork: null,
            usageLimits: {
              state: "stale",
              readAt: null,
              cursor: "1",
              windows: [],
            },
            unreadCount: 1,
            events: [event],
            nextCursor: null,
            pendingReadIds: [],
            pendingReadAll: false,
          },
          "snapshot",
        );
      writing.onsuccess = () => resolve();
      writing.onerror = () => reject(writing.error);
    });
    database.close();
  }, cachedEvent);
}

test("cached activity survives laptop stop and browser offline", async ({
  context,
  page,
}) => {
  await page.goto("/activity?offline=prime");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.goto("/manifest.webmanifest");
  await seedCache(page);
  await context.setOffline(true);
  await page.goto("/activity?offline=cached");
  await expect(
    page.getByText(
      "Đang hiển thị dữ liệu đã lưu. VibePing sẽ đồng bộ khi laptop kết nối lại.",
    ),
  ).toBeVisible();
  await expect(page.getByText("vibeping-offline")).toBeVisible();
});

test("IndexedDB version one upgrades to the current activity cache schema", async ({
  page,
}) => {
  await page.goto("/manifest.webmanifest");
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const deleting = indexedDB.deleteDatabase("vibeping-mobile");
      deleting.onsuccess = () => resolve();
      deleting.onerror = () => resolve();
    });
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open("vibeping-mobile", 1);
      opening.onupgradeneeded = () =>
        opening.result.createObjectStore("legacy-activity");
      opening.onsuccess = () => {
        opening.result.close();
        resolve();
      };
      opening.onerror = () => reject(opening.error);
    });
  });
  await page.goto("/activity?cache=upgrade");
  await expect(
    page.getByRole("heading", { name: "Chưa theo dõi được Codex" }),
  ).toBeVisible();
  const schema = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open("vibeping-mobile");
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    return {
      version: database.version,
      stores: [...database.objectStoreNames],
    };
  });
  expect(schema).toEqual({
    version: 2,
    stores: ["activity-feed", "legacy-activity"],
  });
});
