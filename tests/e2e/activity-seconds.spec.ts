import { expect, test } from "@playwright/test";
import {
  measurableFindings,
  useExplicitProjectTheme,
} from "./phase-9-product-fixture";
import { routeWorkingDetail } from "./session-detail-motion-fixture";

test.use({ serviceWorkers: "block" });

test("home working time advances every second, wraps at a minute and stays readable for long work", async ({
  page,
}, testInfo) => {
  const fixture = await routeWorkingDetail(page);
  const at = new Date();
  fixture.session.session!.startedAt = new Date(
    at.getTime() - 59_000,
  ).toISOString();
  fixture.session.session!.updatedAt = at.toISOString();
  await useExplicitProjectTheme(page, testInfo);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Keep real intervals and Angular startup running; only control wall time.
  await page.clock.setFixedTime(at);
  await page.goto("/activity");
  const timer = page.locator("app-live-status-card").getByRole("timer");
  await expect(timer).toHaveText("59 giây");
  await expect(timer).toHaveAttribute("aria-live", "off");
  await page.clock.setFixedTime(new Date(at.getTime() + 1000));
  await expect(timer).toHaveText("1 phút 0 giây");
  await page.clock.setFixedTime(new Date(at.getTime() + 2000));
  await expect(timer).toHaveText("1 phút 1 giây");
  fixture.session.session!.startedAt = new Date(
    at.getTime() - 4_352_000,
  ).toISOString();
  await fixture.state("running");
  await expect(timer).toHaveText("1 giờ 12 phút 34 giây");
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await measurableFindings(page, `working seconds ${width}`)).toEqual(
      [],
    );
    await page.screenshot({
      path: `.impeccable/review/working-seconds/${testInfo.project.name}-${width}.png`,
      fullPage: true,
    });
  }
  await fixture.state("completed");
  await expect(timer).toHaveCount(0);
});
