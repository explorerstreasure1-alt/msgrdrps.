const CACHE = "msgrdrps-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/logo-admin.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.hostname === "localhost" || url.hostname === "127.0.0.1") return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(e.request);
          if (res.ok && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        } catch {
          return caches.match("/index.html");
        }
      })()
    );
    return;
  }

  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      } catch {
        return caches.match("/index.html");
      }
    })()
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (e) => {
  let data = { title: "MSgrdrps", body: "", url: "/", icon: "/logo.png" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {}
  const promise = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.icon,
    data: { url: data.url },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  });
  e.waitUntil(promise);
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const c of clientsList) {
        if (c.url === url && "focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
