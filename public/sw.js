/// <reference lib="webworker" />

console.log("[ServiceWorker] Service Worker loaded");

// Service Worker version for cache busting
const SW_VERSION = '1.0.0';

self.addEventListener("install", (event) => {
	console.log("[ServiceWorker] Installing new version:", SW_VERSION);
	event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
	console.log("[ServiceWorker] Activated version:", SW_VERSION);
	event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
	console.log("[ServiceWorker] Push received");

	if (!event.data) {
		console.log("[ServiceWorker] Push received but no data");
		return;
	}

	try {
		const data = event.data.json();
		console.log("[ServiceWorker] Push data:", data);

		const options = {
			body: data.body,
			icon: data.icon,
			badge: data.badge,
			data: data.data,
			requireInteraction: true,
			actions: [
				{
					action: "open",
					title: "Open",
				},
			],
		};

		event.waitUntil(self.registration.showNotification(data.title, options));
	} catch (error) {
		console.error("[ServiceWorker] Error processing push event:", error);
	}
});

self.addEventListener("notificationclick", (event) => {
	console.log("[ServiceWorker] Notification clicked:", event.notification.tag);

	event.notification.close();

	const urlToOpen = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			// If a window client is available, focus it
			for (const client of clientList) {
				if (client.url === urlToOpen && "focus" in client) {
					return client.focus();
				}
			}
			// If no window client is available, open a new one
			if (self.clients.openWindow) {
				return self.clients.openWindow(urlToOpen);
			}
		})
	);
});

// Handle errors
self.addEventListener("error", (event) => {
	console.error("[ServiceWorker] Error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
	console.error("[ServiceWorker] Unhandled rejection:", event.reason);
});
