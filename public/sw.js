const CACHE = "msgrdrps-v4";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).catch(() => {})
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(e.request);
          return res;
        } catch {
          try {
            const cached = await caches.match("/index.html");
            if (cached) return cached;
          } catch {}
          return new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  e.respondWith(
    (async () => {
      try {
        const res = await fetch(e.request);
        return res;
      } catch {
        try {
          const cached = await caches.match(e.request);
          if (cached) return cached;
        } catch {}
        return new Response("", { status: 408 });
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
