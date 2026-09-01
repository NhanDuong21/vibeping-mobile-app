import assert from "node:assert/strict";
import test from "node:test";

import {
  canEnableNotifications,
  capabilitySummary,
  safeErrorCopy,
} from "../web/readiness.js";

test("capability summary uses feature detection and standalone mode", () => {
  const environment = {
    isSecureContext: true,
    location: { hostname: "vibeping.example-tailnet.ts.net" },
    navigator: { serviceWorker: {}, standalone: false },
    Notification: { permission: "default" },
    PushManager: class {},
    matchMedia: () => ({ matches: true }),
  };
  assert.deepEqual(capabilitySummary(environment), {
    secureContext: true,
    privateOrigin: true,
    serviceWorker: true,
    notification: true,
    pushManager: true,
    standalone: true,
  });
});

test("permission enablement requires every material prerequisite", () => {
  const ready = {
    secureContext: true,
    privateOrigin: true,
    serviceWorker: true,
    notification: true,
    pushManager: true,
    standalone: true,
  };
  assert.equal(canEnableNotifications(ready, "default", true), true);
  assert.equal(canEnableNotifications({ ...ready, standalone: false }, "default", true), false);
  assert.equal(canEnableNotifications({ ...ready, privateOrigin: false }, "default", true), false);
  assert.equal(canEnableNotifications(ready, "denied", true), false);
  assert.equal(canEnableNotifications(ready, "default", false), false);
});

test("unsupported browsers remain safely disabled", () => {
  const capabilities = capabilitySummary({
    isSecureContext: true,
    location: { hostname: "vibeping.example-tailnet.ts.net" },
    navigator: { standalone: true },
    matchMedia: () => ({ matches: true }),
  });
  assert.equal(capabilities.notification, false);
  assert.equal(capabilities.pushManager, false);
  assert.equal(capabilities.serviceWorker, false);
  assert.equal(canEnableNotifications(capabilities, "unsupported", true), false);
});

test("unknown technical failures always become safe Vietnamese copy", () => {
  assert.equal(safeErrorCopy("DOES_NOT_EXIST"), "Đã có lỗi khi kiểm tra. VibePing sẽ tự thử lại.");
  assert.equal(safeErrorCopy("PHONE_REGISTRATION_STALE"), "Điện thoại cần bật lại thông báo.");
});
