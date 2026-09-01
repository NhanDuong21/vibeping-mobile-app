import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const webDirectory = fileURLToPath(new URL("../web/", import.meta.url));
const requiredFiles = [
  "index.html",
  "app.js",
  "readiness.js",
  "push-helpers.js",
  "sw.js",
  "manifest.webmanifest",
  "tailwind.input.css",
  "generated/app.css",
  "assets/logo-icon-180.png",
  "assets/logo-icon-192.png",
  "assets/logo-icon-512.png",
];

await Promise.all(requiredFiles.map((path) => access(new URL(path, `file:///${webDirectory.replaceAll("\\", "/")}/`))));

const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", `file:///${webDirectory.replaceAll("\\", "/")}/`), "utf8"));
assert.equal(manifest.id, "/");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.lang, "vi");
assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.src === "/assets/logo-icon-192.png"));
assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.src === "/assets/logo-icon-512.png"));

const source = await Promise.all(
  ["index.html", "app.js", "sw.js", "tailwind.input.css"].map((path) =>
    readFile(new URL(path, `file:///${webDirectory.replaceAll("\\", "/")}/`), "utf8"),
  ),
);
assert.ok(source[0].includes('lang="vi"'));
assert.ok(source[0].includes('viewport-fit=cover'));
assert.ok(source[0].includes('/assets/logo-icon-180.png'));
assert.ok(source[0].includes('/assets/logo-icon-192.png'));
assert.ok(source[1].includes('Notification.requestPermission()'));
assert.ok(source[2].includes('notificationclick'));
assert.ok(source[2].includes('vibeping-gate0-shell-v2'));
assert.ok(source[2].includes('/assets/logo-icon-512.png'));
assert.ok(source[3].includes('@import "tailwindcss"'));
assert.equal(source.some((text) => /cdn\.tailwindcss|fonts\.googleapis|unpkg\.com/.test(text)), false);

console.log("Gate 0 PWA files and stable identity are valid.");
