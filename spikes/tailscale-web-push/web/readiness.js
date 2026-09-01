export const ERROR_COPY = Object.freeze({
  INVALID_PHONE_REGISTRATION: "Điện thoại cần bật lại thông báo.",
  PHONE_NOT_READY: "Điện thoại cần bật lại thông báo.",
  PHONE_REGISTRATION_STALE: "Điện thoại cần bật lại thông báo.",
  DELIVERY_RETRY_LATER: "Chưa gửi được thông báo. VibePing sẽ tự thử lại.",
  DELIVERY_UNAVAILABLE: "Chưa kết nối được với laptop. VibePing sẽ tự thử lại.",
  DELIVERY_REJECTED: "Chưa gửi được thông báo thử.",
  ORIGIN_NOT_ALLOWED: "Kết nối riêng tư chưa sẵn sàng.",
  NETWORK_UNAVAILABLE: "Chưa kết nối được với laptop. VibePing sẽ tự thử lại.",
  UNSUPPORTED: "Trình duyệt chưa hỗ trợ.",
  PERMISSION_DENIED: "Thông báo đang bị tắt trên iPhone.",
  UNKNOWN: "Đã có lỗi khi kiểm tra. VibePing sẽ tự thử lại.",
});

export function safeErrorCopy(code) {
  return ERROR_COPY[code] || ERROR_COPY.UNKNOWN;
}

export function isStandalone(environment) {
  return Boolean(
    environment?.matchMedia?.("(display-mode: standalone)")?.matches ||
    environment?.navigator?.standalone === true,
  );
}

export function capabilitySummary(environment) {
  const navigatorObject = environment?.navigator || {};
  const hostname = environment?.location?.hostname?.toLowerCase?.() || "";
  return {
    secureContext: environment?.isSecureContext === true,
    privateOrigin: hostname.endsWith(".ts.net"),
    serviceWorker: "serviceWorker" in navigatorObject,
    notification: "Notification" in environment,
    pushManager: "PushManager" in environment,
    standalone: isStandalone(environment),
  };
}

export function canEnableNotifications(capabilities, permission, serverConnected) {
  return Boolean(
    capabilities.secureContext &&
    capabilities.privateOrigin &&
    capabilities.serviceWorker &&
    capabilities.notification &&
    capabilities.pushManager &&
    capabilities.standalone &&
    permission !== "denied" &&
    serverConnected,
  );
}
