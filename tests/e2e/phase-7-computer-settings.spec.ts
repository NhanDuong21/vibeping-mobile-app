import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const pairing = {
  state: "paired",
  ownerMatch: true,
  privateIdentityReady: true,
  codeExpiresAt: null,
  csrfToken: "test-csrf",
};

const preferences = {
  notifications: {
    completion: true,
    permission: true,
    preview: true,
    finalFailure: true,
    allowance: true,
  },
  allowanceThresholdPercent: 20,
  criticalAllowanceNotifications: true,
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "07:00",
    timezoneOffsetMinutes: 420,
    allowUrgent: true,
  },
  privacyMode: "standard",
  theme: "system",
  retentionDays: 30,
};

async function routePairing(page: Page): Promise<void> {
  await page.route("**/api/v1/pairing/status", (route) =>
    route.fulfill({ json: pairing }),
  );
}

test("computer summarizes readiness and queues a delayed notification test", async ({
  page,
}) => {
  await routePairing(page);
  await page.route("**/api/v1/computer/status", (route) =>
    route.fulfill({
      json: {
        desktop: "running",
        codex: "connected",
        allowanceReader: "available",
        notifications: "ready",
        privateConnection: "ready",
        lastSignalAt: "2026-09-02T01:00:00Z",
        startedAt: "2026-09-02T00:00:00Z",
      },
    }),
  );
  await page.route("**/api/v1/push/test", (route) =>
    route.fulfill({
      json: {
        state: "providerAccepted",
        queued: 1,
        sendAfter: "2026-09-02T01:00:10Z",
      },
    }),
  );

  await page.goto("/computer");
  await expect(page.getByRole("heading", { name: "Máy tính" })).toBeVisible();
  await expect(page.getByText("Đã nhận tín hiệu từ Codex")).toBeVisible();
  await expect(
    page.getByText("Đang dùng kết nối Tailscale riêng tư"),
  ).toBeVisible();
  const request = page.waitForRequest("**/api/v1/push/test");
  await page.getByRole("button", { name: "Gửi thử sau 10 giây" }).click();
  expect((await request).headers()["x-vibeping-csrf"]).toBe("test-csrf");
  await expect(
    page.getByText("Đã gửi tín hiệu. Hãy kiểm tra Màn hình khóa."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Kiểm tra VibePing/ }),
  ).toBeVisible();
});

test("leave-laptop readiness stays blocked until Codex hooks are reviewed", async ({
  page,
}) => {
  await page.route("**/api/v1/bootstrap", (route) =>
    route.fulfill({
      json: {
        serverTime: "2026-09-02T01:01:00Z",
        cursor: "1",
        unreadCount: 0,
        connection: {
          desktop: "running",
          codex: "needsReview",
          privateConnection: "local",
        },
        currentWork: null,
        usageLimits: {
          state: "available",
          readAt: null,
          windows: [],
          cursor: "1",
        },
      },
    }),
  );
  await page.route(/\/api\/v1\/events(\?.*)?$/, (route) =>
    route.fulfill({ json: { events: [], nextCursor: null, unreadCount: 0 } }),
  );
  await page.route("**/api/v1/computer/status", (route) =>
    route.fulfill({
      json: {
        desktop: "running",
        codex: "needsReview",
        allowanceReader: "available",
        notifications: "ready",
        privateConnection: "ready",
        lastSignalAt: null,
        startedAt: "2026-09-02T00:00:00Z",
      },
    }),
  );

  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Chưa nhận đủ tín hiệu từ Codex" }),
  ).toBeVisible();
  await expect(page.getByText("Cần hoàn tất 1 bước")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bạn có thể rời laptop" }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Xem cách thực hiện" }).click();
  await expect(
    page.getByRole("heading", { name: "Cần hoàn tất theo dõi Codex" }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Cần hoàn tất theo dõi Codex" })
    .locator("..")
    .getByText("Xem cách thực hiện")
    .click();
  await expect(page.getByText("/hooks")).toBeVisible();
});

test("settings persist all behavior controls including overnight quiet hours", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      get: () => "denied" as NotificationPermission,
    });
  });
  await routePairing(page);
  let saved = structuredClone(preferences);
  await page.route("**/api/v1/preferences", async (route) => {
    if (route.request().method() === "PUT") {
      saved = route.request().postDataJSON() as typeof preferences;
      await route.fulfill({ json: saved });
    } else {
      await route.fulfill({ json: saved });
    }
  });

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
  await page
    .getByRole("switch", { name: "Thông báo công việc hoàn tất" })
    .click();
  await page.getByRole("button", { name: "30%" }).click();
  await page
    .getByRole("switch", { name: "Thông báo khi hạn mức gần hết" })
    .click();
  await page.locator('input[type="time"]').nth(0).fill("23:00");
  await page.locator('input[type="time"]').nth(1).fill("06:30");
  await page.getByRole("switch", { name: "Cho phép thông báo gấp" }).click();
  await page.getByRole("button", { name: "Chỉ báo" }).click();
  await page.getByRole("button", { name: "Tối", exact: true }).click();
  await page.getByRole("button", { name: /90\s*ngày/ }).click();
  await expect(page.getByText("Đã lưu")).toBeVisible();
  await expect.poll(() => saved.retentionDays).toBe(90);
  expect(saved).toMatchObject({
    notifications: { completion: false },
    allowanceThresholdPercent: 30,
    criticalAllowanceNotifications: false,
    quietHours: {
      enabled: true,
      start: "23:00",
      end: "06:30",
      allowUrgent: false,
    },
    privacyMode: "private",
    theme: "dark",
    retentionDays: 90,
  });

  await page.reload();
  await expect(page.getByRole("button", { name: /90\s*ngày/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Xem cách bật lại" }).click();
  await expect(page.getByText(/Mở Cài đặt iPhone/)).toBeVisible();
});

test("diagnostics gives recovery actions and copies only the sanitized report", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await routePairing(page);
  const report = {
    generatedAt: "2026-09-02T01:00:00Z",
    checks: [
      {
        key: "desktop",
        label: "Ứng dụng trên laptop",
        state: "ready",
        detail: "VibePing đang chạy trên laptop.",
        action: null,
      },
      {
        key: "notifications",
        label: "Thông báo iPhone",
        state: "needsAttention",
        detail: "Mở Cài đặt và chọn Đăng ký lại thông báo.",
        action: "Mở Cài đặt và chọn Đăng ký lại thông báo.",
      },
    ],
    technicalReport:
      "VibePing 1.0.0-rc.1\ndesktop=running\nnotifications=needsAttention",
  };
  await page.route("**/api/v1/diagnostics", (route) =>
    route.fulfill({ json: report }),
  );
  await page.route("**/api/v1/diagnostics/run", (route) =>
    route.fulfill({ json: report }),
  );

  await page.goto("/diagnostics");
  await expect(
    page.getByRole("heading", { name: "VibePing có sẵn sàng?" }),
  ).toBeVisible();
  await expect(page.getByText(/Việc cần làm:/)).toBeVisible();
  await page.getByText("Báo cáo kỹ thuật đã làm sạch").click();
  await page.getByRole("button", { name: "Sao chép báo cáo" }).click();
  await expect(page.getByText("Đã sao chép báo cáo.")).toBeVisible();
  expect(
    (await page.evaluate(() => navigator.clipboard.readText())).replaceAll(
      "\r\n",
      "\n",
    ),
  ).toBe(report.technicalReport);
  const rerun = page.waitForRequest("**/api/v1/diagnostics/run");
  await page.getByRole("button", { name: "Chạy kiểm tra lại" }).click();
  expect((await rerun).headers()["x-vibeping-csrf"]).toBe("test-csrf");

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
