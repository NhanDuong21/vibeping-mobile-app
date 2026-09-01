import assert from "node:assert/strict";
import test from "node:test";

await import("../web/push-helpers.js");

test("valid push JSON is normalized", () => {
  const result = globalThis.VibePingPush.normalize({
    title: "VibePing",
    body: "Xong việc",
    tag: "done",
    url: "/activity",
    timestamp: 123,
  });
  assert.deepEqual(result, {
    title: "VibePing",
    body: "Xong việc",
    tag: "done",
    url: "/activity",
    timestamp: 123,
  });
});

test("text and malformed values receive safe fallbacks", () => {
  assert.equal(globalThis.VibePingPush.normalize("Tin nhắn").body, "Tin nhắn");
  assert.equal(globalThis.VibePingPush.normalize({ url: "https://example.com" }).url, "/");
  assert.equal(globalThis.VibePingPush.normalize(null).title, "VibePing");
});
