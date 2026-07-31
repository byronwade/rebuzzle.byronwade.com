/// <reference lib="webworker" />

console.log("[ServiceWorker] Service Worker loaded");

// Service Worker version for cache busting
const SW_VERSION = "2.2.0";

// Cache names
const CACHE_NAME = `rebuzzle-cache-v${SW_VERSION}`;
const RUNTIME_CACHE = `rebuzzle-runtime-v${SW_VERSION}`;

self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installing new version:", SW_VERSION);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Only cache essential files
        return cache
          .addAll(["/", "/icon.svg", "/manifest.json"].filter(Boolean))
          .catch((error) => {
            console.warn("[ServiceWorker] Cache addAll failed:", error);
            return Promise.resolve();
          });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activated version:", SW_VERSION);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log("[ServiceWorker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Enhanced fetch handler with proper error handling
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip Service Worker for:
  // - Development hot reload chunks
  // - Next.js internal requests
  // - Chrome extensions
  // - Non-HTTP(S) requests
  if (
    url.pathname.includes("/_next/static/chunks/") || // Next.js chunks
    url.pathname.includes("/_next/webpack-hmr") || // HMR
    url.pathname.includes("[turbopack]") || // Turbopack dev
    url.pathname.includes("hot-update") || // Hot updates
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.origin !== location.origin
  ) {
    // Let browser handle these directly
    return;
  }

  // For API routes, always go to network
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.error("[ServiceWorker] API fetch failed:", error);
        return new Response(
          JSON.stringify({
            error: "Network error",
            message: "Unable to reach server",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // For other requests, try cache-first, then network
  event.respondWith(
    caches
      .match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache POST, PUT, DELETE, or PATCH requests
            if (request.method !== "GET" && request.method !== "HEAD") {
              return response;
            }

            // Only cache successful GET/HEAD responses
            if (
              !response ||
              response.status !== 200 ||
              response.type === "error"
            ) {
              return response;
            }

            // Clone response for caching
            const responseToCache = response.clone();

            caches
              .open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              })
              .catch((error) => {
                console.warn("[ServiceWorker] Runtime cache failed:", error);
              });

            return response;
          })
          .catch((error) => {
            console.error("[ServiceWorker] Fetch failed:", error);
            // Return offline page or error response
            return new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
      })
      .catch((error) => {
        console.error("[ServiceWorker] Cache match failed:", error);
        // Fallback to network
        return fetch(request);
      })
  );
});

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push notification received");

  if (!event.data) {
    console.log("[ServiceWorker] Push event but no data");
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || "New puzzle available!",
      icon: data.icon || "/icon-192x192.png",
      badge: data.badge || "/icon-192x192.png",
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction,
      tag: data.tag || "rebuzzle-notification",
      vibrate: data.vibrate || [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Rebuzzle", options)
    );
  } catch (error) {
    console.error("[ServiceWorker] Error handling push:", error);
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[ServiceWorker] Notification clicked");

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log("[ServiceWorker] All event listeners registered");
