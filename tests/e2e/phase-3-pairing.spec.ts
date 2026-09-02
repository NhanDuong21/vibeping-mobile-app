import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("pairing surfaces stable invalid-code recovery copy", async ({ page }) => {
  await page.route("**/api/v1/pairing/status", (route) =>
    route.fulfill({
      json: {
        state: "pairingRequired",
        ownerMatch: false,
        privateIdentityReady: true,
        codeExpiresAt: null,
        csrfToken: "test-csrf",
      },
    }),
  );
  await page.route("**/api/v1/push/public-key", (route) =>
    route.fulfill({ json: { publicKey: "test-public-key" } }),
  );
  await page.route("**/api/v1/pairing/claim", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: "PAIRING_CODE_INVALID",
        requestId: "request-test",
      }),
    }),
  );
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Mã kết nối").fill("AAAA-AAAA");
  await page.getByRole("button", { name: "Kết nối" }).click();
  await expect(page.getByText("Mã kết nối chưa đúng.")).toBeVisible();
});
