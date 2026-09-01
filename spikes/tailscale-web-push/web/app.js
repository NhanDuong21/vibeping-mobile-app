import {
  canEnableNotifications,
  capabilitySummary,
  safeErrorCopy,
} from "/readiness.js";

const elements = {
  overall: document.querySelector("#overall-status"),
  guide: document.querySelector("#install-guide"),
  permissionGuide: document.querySelector("#permission-guide"),
  message: document.querySelector("#message"),
  enable: document.querySelector("#enable-button"),
  send: document.querySelector("#send-button"),
  report: document.querySelector("#technical-report"),
  copyReport: document.querySelector("#copy-report-button"),
  refresh: document.querySelector("#refresh-button"),
};

const statusElements = Object.fromEntries(
  ["secure", "install", "permission", "phone", "server"].map((key) => [
    key,
    {
      dot: document.querySelector(`#${key}-dot`),
      text: document.querySelector(`#${key}-status`),
    },
  ]),
);

const dotClasses = {
  checking: "size-2 shrink-0 rounded-full bg-muted dark:bg-night-muted",
  ready: "size-2 shrink-0 rounded-full bg-signal",
  warning: "size-2 shrink-0 rounded-full bg-warning",
  error: "size-2 shrink-0 rounded-full bg-danger",
};

const state = {
  capabilities: capabilitySummary(window),
  serverConnected: false,
  workerRegistration: null,
  phoneReady: false,
  lastErrorCode: null,
};

function setStatus(key, label, kind = "checking") {
  statusElements[key].text.textContent = label;
  statusElements[key].dot.className = dotClasses[kind] || dotClasses.checking;
}

function setMessage(message) {
  elements.message.textContent = message;
}

function currentPermission() {
  return state.capabilities.notification ? Notification.permission : "unsupported";
}

function refreshActions() {
  const permission = currentPermission();
  elements.enable.disabled = !canEnableNotifications(
    state.capabilities,
    permission,
    state.serverConnected,
  ) || !state.workerRegistration;
  elements.enable.hidden = state.capabilities.standalone && permission === "denied";
  elements.send.hidden = !state.phoneReady;
  elements.send.disabled = !state.phoneReady || !state.serverConnected;
  elements.overall.textContent = currentSummary(permission);
}

function currentSummary(permission) {
  const capabilities = state.capabilities;
  const supported =
    capabilities.notification &&
    capabilities.pushManager &&
    capabilities.serviceWorker;
  if (!capabilities.standalone) return "Cần cài lên Màn hình chính";
  if (!supported) return "Trình duyệt chưa hỗ trợ";
  if (!capabilities.privateOrigin || !capabilities.secureContext) return "Cần mở địa chỉ riêng tư";
  if (!state.workerRegistration) return "Chưa chuẩn bị xong";
  if (permission === "denied") return "Cần bật lại thông báo";
  if (permission !== "granted") return "Cần bật thông báo";
  if (!state.serverConnected) return "Chưa kết nối được";
  if (!state.phoneReady) return "Cần bật lại thông báo";
  return "Sẵn sàng";
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("Gate 0 request failed");
      error.code = payload.errorCode || "UNKNOWN";
      throw error;
    }
    return payload;
  } catch (error) {
    if (!error.code) error.code = "NETWORK_UNAVAILABLE";
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function base64UrlToBytes(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function savePhoneRegistration(subscription) {
  await fetchJson("/api/subscription", {
    method: "POST",
    body: JSON.stringify(subscription.toJSON()),
  });
}

function showCapabilityState() {
  const capabilities = state.capabilities;
  const privateReady = capabilities.secureContext && capabilities.privateOrigin;
  setStatus(
    "secure",
    privateReady ? "Sẵn sàng" : "Chưa mở qua địa chỉ riêng tư",
    privateReady ? "ready" : "warning",
  );
  setStatus(
    "install",
    capabilities.standalone ? "Sẵn sàng" : "Chưa cài lên Màn hình chính",
    capabilities.standalone ? "ready" : "warning",
  );
  elements.guide.hidden = capabilities.standalone;
  elements.permissionGuide.hidden = !(capabilities.standalone && currentPermission() === "denied");

  if (!capabilities.notification || !capabilities.pushManager || !capabilities.serviceWorker) {
    setStatus("permission", "Trình duyệt chưa hỗ trợ", "error");
    setStatus("phone", "Trình duyệt chưa hỗ trợ", "error");
  } else if (Notification.permission === "denied") {
    setStatus("permission", "Thông báo đang bị tắt", "error");
  } else if (Notification.permission === "granted") {
    setStatus("permission", "Đã bật", "ready");
  } else {
    setStatus("permission", "Thông báo chưa được bật", "warning");
  }
}

async function checkServer() {
  try {
    const health = await fetchJson("/api/health");
    if (health.service !== "vibeping-gate0" || health.status !== "ok") {
      const error = new Error("Unexpected local service");
      error.code = "NETWORK_UNAVAILABLE";
      throw error;
    }
    state.serverConnected = true;
    setStatus("server", "Đã kết nối", "ready");
  } catch (error) {
    state.serverConnected = false;
    state.lastErrorCode = error.code;
    setStatus("server", "Chưa kết nối", "error");
    setMessage(safeErrorCopy(error.code));
  }
}

async function checkPhoneRegistration() {
  if (!state.workerRegistration || currentPermission() !== "granted") {
    state.phoneReady = false;
    setStatus("phone", "Chưa sẵn sàng", "warning");
    return;
  }
  const subscription = await state.workerRegistration.pushManager.getSubscription();
  if (!subscription) {
    state.phoneReady = false;
    setStatus("phone", "Cần bật lại thông báo", "warning");
    return;
  }
  try {
    await savePhoneRegistration(subscription);
    state.phoneReady = true;
    setStatus("phone", "Điện thoại đã sẵn sàng", "ready");
  } catch (error) {
    state.phoneReady = false;
    state.lastErrorCode = error.code;
    setStatus("phone", "Chưa sẵn sàng", "error");
  }
}

async function initializeWorker() {
  if (!state.capabilities.serviceWorker) return;
  try {
    state.workerRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    state.workerRegistration = await navigator.serviceWorker.ready;
    await state.workerRegistration.update().catch(() => {});
  } catch {
    state.lastErrorCode = "UNSUPPORTED";
  }
}

async function initialize() {
  showCapabilityState();
  await Promise.all([checkServer(), initializeWorker()]);
  await checkPhoneRegistration().catch(() => {
    state.phoneReady = false;
    state.lastErrorCode = "UNKNOWN";
    setStatus("phone", "Chưa sẵn sàng", "error");
  });
  if (state.phoneReady) {
    setMessage("Điện thoại đã sẵn sàng. Bạn có thể gửi thông báo thử.");
  } else if (!state.capabilities.standalone) {
    setMessage("Cài VibePing lên Màn hình chính, rồi mở từ biểu tượng mới.");
  } else if (currentPermission() === "denied") {
    setMessage(safeErrorCopy("PERMISSION_DENIED"));
  } else if (state.lastErrorCode === "UNKNOWN" || state.lastErrorCode === "UNSUPPORTED") {
    setMessage(safeErrorCopy(state.lastErrorCode));
  } else if (!state.serverConnected) {
    setMessage(safeErrorCopy("NETWORK_UNAVAILABLE"));
  } else {
    setMessage("Sẵn sàng. Nhấn “Bật thông báo” khi bạn muốn tiếp tục.");
  }
  refreshActions();
  refreshReport();
}

async function enableNotifications() {
  elements.enable.disabled = true;
  setMessage("Đang chuẩn bị bật thông báo…");
  try {
    const permission = await Notification.requestPermission();
    showCapabilityState();
    if (permission !== "granted") {
      state.lastErrorCode = permission === "denied" ? "PERMISSION_DENIED" : "UNKNOWN";
      setMessage(safeErrorCopy(state.lastErrorCode));
      return;
    }
    const { publicKey } = await fetchJson("/api/vapid-public-key");
    let subscription = await state.workerRegistration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await state.workerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      });
    }
    await savePhoneRegistration(subscription);
    state.phoneReady = true;
    setStatus("phone", "Điện thoại đã sẵn sàng", "ready");
    setMessage("Điện thoại đã sẵn sàng. Hãy khóa iPhone trước khi gửi thử.");
  } catch (error) {
    state.phoneReady = false;
    state.lastErrorCode = error.code || "UNKNOWN";
    setStatus("phone", "Chưa sẵn sàng", "error");
    setMessage(safeErrorCopy(state.lastErrorCode));
  } finally {
    refreshActions();
    refreshReport();
  }
}

async function sendTestNotification() {
  elements.send.disabled = true;
  setMessage("Đang gửi thông báo thử…");
  try {
    await fetchJson("/api/test-push", { method: "POST", body: "{}" });
    setMessage("Đã gửi yêu cầu. Hãy kiểm tra Màn hình khóa của iPhone.");
  } catch (error) {
    state.lastErrorCode = error.code || "UNKNOWN";
    if (error.code === "PHONE_REGISTRATION_STALE") {
      state.phoneReady = false;
      setStatus("phone", "Cần bật lại thông báo", "warning");
    }
    setMessage(safeErrorCopy(state.lastErrorCode));
  } finally {
    refreshActions();
    refreshReport();
  }
}

function refreshReport() {
  const report = {
    origin: window.location.origin,
    secureContext: state.capabilities.secureContext,
    privateOrigin: state.capabilities.privateOrigin,
    standalone: state.capabilities.standalone,
    serviceWorker: state.capabilities.serviceWorker,
    serviceWorkerScope: state.workerRegistration?.scope || null,
    notifications: state.capabilities.notification,
    permission: currentPermission(),
    phoneReady: state.phoneReady,
    serverConnected: state.serverConnected,
    lastSafeCode: state.lastErrorCode,
  };
  elements.report.textContent = JSON.stringify(report, null, 2);
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(elements.report.textContent);
    setMessage("Đã sao chép báo cáo kỹ thuật.");
  } catch {
    setMessage("Chưa sao chép được báo cáo. Bạn có thể chọn và sao chép thủ công.");
  }
}

elements.enable.addEventListener("click", enableNotifications);
elements.send.addEventListener("click", sendTestNotification);
elements.copyReport.addEventListener("click", copyReport);
elements.refresh.addEventListener("click", () => {
  initialize().catch(() => setMessage(safeErrorCopy("UNKNOWN")));
});
window.addEventListener("pageshow", () => initialize().catch(() => setMessage(safeErrorCopy("UNKNOWN"))));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") initialize().catch(() => {});
});
