import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { chromium, devices, expect } from "@playwright/test";

// Exercises the real old worker -> new release -> explicit update -> offline shell
// in a disposable browser/data directory. Never targets the installed private app.
const [oldArgument, newArgument] = process.argv.slice(2);
assert(
  oldArgument && newArgument,
  "Pass the previous and current Windows release executables.",
);
const oldBinary = resolve(oldArgument);
const newBinary = resolve(newArgument);
const expectedVersion = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version;
const dataDirectory = await mkdtemp(join(tmpdir(), "vibeping-pwa-upgrade-"));
const origin = "http://127.0.0.1:8796";
const execute = promisify(execFile);
let runningBinary;
let browser;

async function start(binary) {
  await execute(
    binary,
    ["start", "--port", "8796", "--data-dir", dataDirectory],
    {
      windowsHide: true,
      timeout: 30_000,
    },
  );
  runningBinary = binary;
}

async function stop() {
  if (!runningBinary) return;
  await execute(runningBinary, ["stop", "--data-dir", dataDirectory], {
    windowsHide: true,
    timeout: 30_000,
  });
  runningBinary = undefined;
}

try {
  // Refuse to share a port with any existing application.
  let occupied = false;
  try {
    occupied = (await fetch(`${origin}/api/v1/health`)).ok;
  } catch {
    /* unused port */
  }
  assert(!occupied, "The isolated smoke port is already in use.");
  await start(oldBinary);
  browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  await page.goto(`${origin}/activity`);
  await page.evaluate(async () => {
    localStorage.setItem("vibeping-upgrade-smoke", "preserved");
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const main = page.locator('script[src*="main-"]');
  const oldMain = await main.getAttribute("src");
  assert(oldMain);
  // RC1 cannot drain an open SSE connection on shutdown. Closing its page is
  // the one-time upgrade path; RC2's lifecycle test keeps SSE open during stop.
  await page.goto("about:blank");
  await stop();
  await start(newBinary);
  const health = await (await fetch(`${origin}/api/v1/health`)).json();
  assert.equal(health.version, expectedVersion);
  const manifest = await (await fetch(`${origin}/ngsw.json`)).json();
  assert.equal(manifest.appData.version, expectedVersion);
  const newMain = Object.keys(manifest.hashTable).find((path) =>
    /^\/main-.*\.js$/.test(path),
  );
  assert(newMain && newMain !== oldMain);
  // Navigation uses the old cached shell while its worker downloads the new one.
  await page.goto(`${origin}/activity`);
  await expect(
    page.getByText("Có bản VibePing mới", { exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Cập nhật", exact: true }).click();
  await expect(main).toHaveAttribute(
    "src",
    new RegExp(`^/?${newMain.slice(1)}$`),
    { timeout: 30_000 },
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("vibeping-upgrade-smoke")),
    "preserved",
  );
  await context.setOffline(true);
  await page.reload();
  await expect(main).toHaveAttribute(
    "src",
    new RegExp(`^/?${newMain.slice(1)}$`),
  );
  console.log(
    `PWA upgrade passed: previous release cache -> ${expectedVersion} notice -> explicit update -> new offline shell; local data retained.`,
  );
} finally {
  await browser?.close();
  await stop();
  const target = resolve(dataDirectory);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert(target.startsWith(join(resolve(tmpdir()), "vibeping-pwa-upgrade-")));
  await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
