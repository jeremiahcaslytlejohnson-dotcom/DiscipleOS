const CACHE_NAME = "discipleos-static-v7";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/splash.jpg",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon-64.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept API requests
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Never cache Vite dev-server internals — they're dynamic and change
  // between sessions; caching them causes the app to load stale JS bundles.
  if (
    url.pathname.startsWith("/@vite/") ||
    url.pathname.startsWith("/@fs/") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/")
  ) {
    return;
  }

  // Network-first for document navigations
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match("/");
        })
    );
    return;
  }

  // Cache-first for same-origin static assets only
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {
    title: "DiscipleOS Reminder",
    body: "You have an upcoming reminder.",
    url: "/",
    tag: "discipleos-reminder",
  };

  try {
    data = { ...data, ...event.data.json() };
  } catch (error) {
    console.error("Failed to parse push payload:", error);
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const visibleClient = clientList.find((client) => client.visibilityState === "visible");

      // A visible tab owns foreground delivery, avoiding a second notification
      // when its local reminder timer and the server push refer to the same event.
      if (visibleClient) {
        visibleClient.postMessage({ type: "discipleos-push-received", reminder: data });
        return undefined;
      }

      return self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag || "discipleos-reminder",
        data: {
          url: data.url || "/",
        },
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          const desiredUrl = new URL(targetUrl, self.location.origin);

          if (clientUrl.pathname === desiredUrl.pathname) {
            return client.focus();
          }
        } catch (error) {
          console.error("Failed to compare notification click URL:", error);
        }
      }

      return clients.openWindow(targetUrl);
    })
  );
});