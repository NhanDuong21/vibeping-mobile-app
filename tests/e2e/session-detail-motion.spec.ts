import { expect, test, type Locator } from "@playwright/test";
import {
  capture,
  measurableFindings,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";
import { routeWorkingDetail } from "./session-detail-motion-fixture";

test.use({ serviceWorkers: "block" });
const runningAnimations = (signal: Locator) =>
  signal.evaluate(
    (element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.playState === "running").length,
  );

test("detail keeps a quiet working signal and stops on terminal, waiting and offline states", async ({
  page,
}, testInfo) => {
  const fixture = await routeWorkingDetail(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.goto("/activity/events/detail-motion-session");
  const signal = page.locator("app-session-working-signal");
  await expect(signal).toBeVisible();
  await expect.poll(() => runningAnimations(signal)).toBe(3);
  await expect(signal).toHaveAttribute("aria-hidden", "true");
  expect(await measurableFindings(page, "working detail")).toEqual([]);
  const status = page.getByText("Đang làm việc", { exact: true });
  const firstBox = await status.boundingBox();
  await expect
    .poll(async () =>
      signal
        .locator("span > span")
        .first()
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe("none");
  expect(await status.boundingBox()).toEqual(firstBox);
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, "working detail " + width)).toEqual(
      [],
    );
    await capture(page, testInfo, `detail-working-${width}`);
  }
  for (const state of ["waiting", "failed", "stopped", "unconfirmed"]) {
    await fixture.state(state);
    await expect(signal).toHaveCount(0);
    await fixture.state("running");
    await expect.poll(() => runningAnimations(signal)).toBe(3);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(signal).toHaveCount(0);
  await expect(page.getByText("Dữ liệu đã lưu", { exact: true })).toBeVisible();
  await capture(page, testInfo, "detail-offline");
  await page.unroute("**/api/v1/**");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => runningAnimations(signal)).toBe(3);
  await fixture.state("completed");
  await expect(signal).toHaveCount(0);
  await expect(page.locator("app-result-body")).toContainText(
    "Câu trả lời cuối vẫn được giữ nguyên.",
  );
  await capture(page, testInfo, "detail-completed");
});

test("detail pauses for reduced motion, hidden content, navigation and expired evidence", async ({
  page,
}, testInfo) => {
  await routeWorkingDetail(page);
  await useExplicitProjectTheme(page, testInfo);
  await page.clock.install();
  await page.goto("/activity/events/detail-motion-session");
  const signal = page.locator("app-session-working-signal");
  await expect.poll(() => runningAnimations(signal)).toBe(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => runningAnimations(signal)).toBe(0);
  await capture(page, testInfo, "detail-reduced");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => runningAnimations(signal)).toBe(3);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => runningAnimations(signal)).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => runningAnimations(signal)).toBe(3);
  await page.setViewportSize({ width: 390, height: 360 });
  await page
    .locator("app-event-detail-page app-pull-to-refresh")
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  await expect(signal).not.toBeInViewport();
  await expect.poll(() => runningAnimations(signal)).toBe(0);
  await page
    .locator("app-event-detail-page app-pull-to-refresh")
    .evaluate((element) => {
      element.scrollTop = 0;
    });
  await expect.poll(() => runningAnimations(signal)).toBe(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Quay lại hoạt động" }).click();
  await expect
    .poll(() =>
      signal.count().then((count) => (count ? runningAnimations(signal) : 0)),
    )
    .toBe(0);
  await page.goto("/activity/events/detail-motion-session");
  await expect.poll(() => runningAnimations(signal)).toBe(3);
  await page.clock.fastForward(135_000);
  await expect(signal).toHaveCount(0);
  await expect(
    page.getByText("Chờ tín hiệu mới", { exact: true }),
  ).toBeVisible();
});

for (const level of ["balanced", "minimal"]) {
  test(`detail keeps a static signal at the ${level} motion setting`, async ({
    page,
  }, testInfo) => {
    await routeWorkingDetail(page);
    await useExplicitProjectTheme(page, testInfo);
    await page.addInitScript(
      (value) => localStorage.setItem("vibeping.motion", value),
      level,
    );
    await page.goto("/activity/events/detail-motion-session");
    const signal = page.locator("app-session-working-signal");
    await expect(signal).toBeVisible();
    expect(await runningAnimations(signal)).toBe(0);
    await expect(
      page.getByText("Đang làm việc", { exact: true }),
    ).toBeVisible();
  });
}
