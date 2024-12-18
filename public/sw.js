/// <reference lib="webworker" />

console.log("[ServiceWorker] Service Worker loaded");

self.addEventListener("install", (event) => {
	console.log("[ServiceWorker] Install event");
	event.waitUntil(Promise.all([self.skipWaiting(), console.log("[ServiceWorker] Skip waiting completed")]));
});

self.addEventListener("activate", (event) => {
	console.log("[ServiceWorker] Activate event");
	event.waitUntil(Promise.all([self.clients.claim(), console.log("[ServiceWorker] Clients claimed")]));
});

self.addEventListener("push", (event) => {
	console.log("[ServiceWorker] Push event received");

	if (!event.data) {
		console.log("[ServiceWorker] Push event had no data");
		return;
	}

	try {
		let data;
		try {
			const text = event.data.text();
			console.log("[ServiceWorker] Push data text:", text);
			data = JSON.parse(text);
		} catch (e) {
			console.log("[ServiceWorker] Failed to parse JSON, using text as body");
			data = {
				title: "Rebuzzle",
				body: event.data.text(),
			};
		}
		console.log("[ServiceWorker] Processed push data:", data);

		const options = {
			body: data.body || "New notification",
			icon: data.icon || "/icon.svg",
			badge: data.badge || "/icon.svg",
			tag: data.tag || "rebuzzle-notification",
			data: {
				url: data.url || "/",
				...data.data,
			},
			actions: [
				{
					action: "open",
					title: "Open",
				},
				{
					action: "close",
					title: "Close",
				},
			],
			requireInteraction: true,
			renotify: true,
			timestamp: Date.now(),
		};

		console.log("[ServiceWorker] Showing notification with options:", options);
		event.waitUntil(self.registration.showNotification(data.title || "Rebuzzle", options));
	} catch (error) {
		console.error("[ServiceWorker] Error in push event:", error);
		event.waitUntil(
			self.registration.showNotification("Rebuzzle", {
				body: "New notification",
				icon: "/icon.svg",
				badge: "/icon.svg",
			})
		);
	}
});

self.addEventListener("notificationclick", (event) => {
	console.log("[ServiceWorker] Notification clicked:", event.notification);
	event.notification.close();

	// Handle action clicks
	if (event.action === "close") {
		console.log("[ServiceWorker] Notification closed by user action");
		return;
	}

	const urlToOpen = event.notification.data?.url || "/";
	console.log("[ServiceWorker] Opening URL:", urlToOpen);

	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				// Try to focus an existing window
				for (const client of clientList) {
					if (client.url === urlToOpen && "focus" in client) {
						return client.focus();
					}
				}
				// If no existing window, open a new one
				return clients.openWindow(urlToOpen);
			})
			.catch((error) => {
				console.error("[ServiceWorker] Error opening window:", error);
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
