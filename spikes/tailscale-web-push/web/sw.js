importScripts("/push-helpers.js");

const CACHE_NAME = "vibeping-gate0-shell-v2";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/generated/app.css",
  "/app.js",
  "/readiness.js",
  "/push-helpers.js",
  "/manifest.webmanifest",
  "/assets/logo-icon-180.png",
  "/assets/logo-icon-192.png",
  "/assets/logo-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      )),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html"))),
  );
});

self.addEventListener("push", (event) => {
  let source = null;
  if (event.data) {
    try {
      source = event.data.json();
    } catch {
      source = event.data.text();
    }
  }
  const payload = self.VibePingPush.normalize(source);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/assets/logo-icon-192.png",
      badge: "/assets/logo-icon-192.png",
      tag: payload.tag,
      timestamp: payload.timestamp,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ("navigate" in client && client.url !== target) await client.navigate(target);
        return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
