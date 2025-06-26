/// <reference lib="webworker" />

console.log("[ServiceWorker] Service Worker loaded");

// Service Worker version for cache busting
const SW_VERSION = "2.1.0";

// Cache names
const CACHE_NAME = `rebuzzle-cache-v${SW_VERSION}`;
const RUNTIME_CACHE = `rebuzzle-runtime-v${SW_VERSION}`;

self.addEventListener("install", (event) => {
	console.log("[ServiceWorker] Installing new version:", SW_VERSION);
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				return cache.addAll(["/", "/icon.svg", "/icon-192x192.png", "/icon-512x512.png", "/manifest.json"]);
			})
			.then(() => {
				return self.skipWaiting();
			})
	);
});

self.addEventListener("activate", (event) => {
	console.log("[ServiceWorker] Activated version:", SW_VERSION);
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames.map((cacheName) => {
						if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
							console.log("[ServiceWorker] Deleting old cache:", cacheName);
							return caches.delete(cacheName);
						}
					})
				);
			})
			.then(() => {
				return self.clients.claim();
			})
	);
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

		// Enhanced notification options for mobile
		const options = {
			body: data.body,
			icon: data.icon || "/icon-192x192.png",
			badge: data.badge || "/icon-192x192.png",
			image: data.image,
			data: {
				...data.data,
				timestamp: Date.now(),
			},
			requireInteraction: false, // Don't require interaction on mobile
			silent: false,
			tag: data.tag || "daily-puzzle",
			renotify: true,
			actions: [
				{
					action: "play",
					title: "🎮 Play Now",
					icon: "/icon-192x192.png",
				},
				{
					action: "later",
					title: "⏰ Later",
					icon: "/icon-192x192.png",
				},
			],
			// Mobile-specific options
			vibrate: [100, 50, 100], // Shorter vibration for mobile
			timestamp: Date.now(),
			// iOS-specific options
			sound: "default",
			// Android-specific options
			color: "#8b5cf6",
			sticky: false, // Don't make it sticky on mobile
			// Ensure notification shows even when app is in foreground on mobile
			showTrigger: true,
		};

		event.waitUntil(
			self.registration.showNotification(data.title, options).then(() => {
				console.log("[ServiceWorker] Notification displayed successfully");

				// Track notification display for mobile analytics
				if (data.data?.puzzleId) {
					console.log(`[ServiceWorker] Mobile notification shown for puzzle: ${data.data.puzzleId}`);
				}

				// Send message to all clients about notification display
				return self.clients.matchAll().then((clients) => {
					clients.forEach((client) => {
						client.postMessage({
							type: "NOTIFICATION_DISPLAYED",
							puzzleId: data.data?.puzzleId,
							timestamp: Date.now(),
						});
					});
				});
			})
		);
	} catch (error) {
		console.error("[ServiceWorker] Error processing push event:", error);

		// Mobile-optimized fallback notification
		const fallbackOptions = {
			body: "A new puzzle is ready! Tap to play.",
			icon: "/icon-192x192.png",
			badge: "/icon-192x192.png",
			tag: "daily-puzzle-fallback",
			vibrate: [200, 100, 200],
			actions: [
				{
					action: "open",
					title: "Open Game",
					icon: "/icon-192x192.png",
				},
			],
			data: {
				url: "/",
				fallback: true,
			},
		};

		event.waitUntil(self.registration.showNotification("🧩 New Rebuzzle Puzzle!", fallbackOptions));
	}
});

self.addEventListener("notificationclick", (event) => {
	console.log("[ServiceWorker] Notification clicked:", {
		action: event.action,
		tag: event.notification.tag,
		data: event.notification.data,
	});

	event.notification.close();

	const action = event.action;
	const notificationData = event.notification.data || {};

	// Handle different actions with mobile-optimized behavior
	if (action === "play" || action === "open" || !action) {
		// Open the game directly with mobile-friendly URL
		const urlToOpen = notificationData.url || "/";

		event.waitUntil(
			handleNotificationClick(urlToOpen, {
				action: action || "open",
				puzzleId: notificationData.puzzleId,
				source: "push-notification",
				platform: "mobile",
			})
		);
	} else if (action === "later" || action === "dismiss") {
		// Handle "later" action for mobile
		console.log("[ServiceWorker] User chose to be reminded later");

		// Store reminder preference in IndexedDB for mobile
		event.waitUntil(
			storeReminderPreference(notificationData.puzzleId).then(() => {
				return self.clients.matchAll({ type: "window" }).then((clients) => {
					if (clients.length > 0) {
						clients[0].postMessage({
							type: "NOTIFICATION_ACTION",
							action: "later",
							puzzleId: notificationData.puzzleId,
							platform: "mobile",
						});
					}
				});
			})
		);
	}
});

// Enhanced notification click handler for mobile
async function handleNotificationClick(urlToOpen, analytics = {}) {
	try {
		const clientList = await self.clients.matchAll({
			type: "window",
			includeUncontrolled: true,
		});

		// Check if the app is already open (important for mobile)
		for (const client of clientList) {
			const clientUrl = new URL(client.url);
			const targetUrl = new URL(urlToOpen, client.url);

			if (clientUrl.pathname === targetUrl.pathname && "focus" in client) {
				// Focus existing window and send analytics data
				client.postMessage({
					type: "NOTIFICATION_CLICK",
					...analytics,
				});
				return client.focus();
			}
		}

		// If no existing window, open a new one (mobile-friendly)
		if (self.clients.openWindow) {
			const newClient = await self.clients.openWindow(urlToOpen);
			if (newClient) {
				// Send analytics data to new window after a short delay
				setTimeout(() => {
					newClient.postMessage({
						type: "NOTIFICATION_CLICK",
						...analytics,
					});
				}, 1000);
			}
			return newClient;
		}
	} catch (error) {
		console.error("[ServiceWorker] Error handling notification click:", error);
	}
}

// Store reminder preference for mobile
async function storeReminderPreference(puzzleId) {
	try {
		// Open IndexedDB to store reminder
		const db = await openDB();
		const transaction = db.transaction(["reminders"], "readwrite");
		const store = transaction.objectStore("reminders");

		await store.put({
			puzzleId,
			remindAt: Date.now() + 2 * 60 * 60 * 1000, // Remind in 2 hours
			created: Date.now(),
		});

		console.log("[ServiceWorker] Reminder stored for puzzle:", puzzleId);
	} catch (error) {
		console.error("[ServiceWorker] Error storing reminder:", error);
	}
}

// Simple IndexedDB wrapper for mobile
function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("RebuzzleDB", 1);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains("reminders")) {
				db.createObjectStore("reminders", { keyPath: "puzzleId" });
			}
		};
	});
}

// Handle background sync for mobile offline scenarios
self.addEventListener("sync", (event) => {
	console.log("[ServiceWorker] Background sync:", event.tag);

	if (event.tag === "puzzle-attempt") {
		event.waitUntil(syncPuzzleAttempts());
	} else if (event.tag === "reminder-check") {
		event.waitUntil(checkReminders());
	}
});

async function syncPuzzleAttempts() {
	console.log("[ServiceWorker] Syncing puzzle attempts...");
	// Implementation would sync offline puzzle attempts
}

async function checkReminders() {
	console.log("[ServiceWorker] Checking reminders...");
	try {
		const db = await openDB();
		const transaction = db.transaction(["reminders"], "readonly");
		const store = transaction.objectStore("reminders");
		const reminders = await store.getAll();

		const now = Date.now();
		for (const reminder of reminders) {
			if (reminder.remindAt <= now) {
				// Show reminder notification
				await self.registration.showNotification("🧩 Puzzle Reminder", {
					body: "Don't forget to play today's puzzle!",
					icon: "/icon-192x192.png",
					tag: `reminder-${reminder.puzzleId}`,
					data: { puzzleId: reminder.puzzleId, type: "reminder" },
				});

				// Remove the reminder
				const deleteTransaction = db.transaction(["reminders"], "readwrite");
				await deleteTransaction.objectStore("reminders").delete(reminder.puzzleId);
			}
		}
	} catch (error) {
		console.error("[ServiceWorker] Error checking reminders:", error);
	}
}

// Handle fetch events for mobile offline support
self.addEventListener("fetch", (event) => {
	// Only handle GET requests
	if (event.request.method !== "GET") return;

	// Skip non-HTTP requests
	if (!event.request.url.startsWith("http")) return;

	event.respondWith(
		caches
			.match(event.request)
			.then((response) => {
				if (response) {
					return response;
				}

				return fetch(event.request).then((response) => {
					// Don't cache non-successful responses
					if (!response || response.status !== 200 || response.type !== "basic") {
						return response;
					}

					// Clone the response for caching
					const responseToCache = response.clone();

					caches.open(RUNTIME_CACHE).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return response;
				});
			})
			.catch(() => {
				// Return offline page if available
				if (event.request.destination === "document") {
					return caches.match("/");
				}
			})
	);
});

// Handle periodic background sync (mobile browsers that support it)
self.addEventListener("periodicsync", (event) => {
	console.log("[ServiceWorker] Periodic sync:", event.tag);
	
	if (event.tag === "daily-puzzle-check") {
		event.waitUntil(checkForNewPuzzle());
	}
});

async function checkForNewPuzzle() {
	console.log("[ServiceWorker] Checking for new puzzle...");
	try {
		const response = await fetch('/api/puzzle/today');
		if (response.ok) {
			const puzzle = await response.json();
			// Could show a local notification if needed
			console.log("[ServiceWorker] New puzzle available:", puzzle.id);
		}
	} catch (error) {
		console.error("[ServiceWorker] Error checking for new puzzle:", error);
	}
}

// Handle errors
self.addEventListener("error", (event) => {
	console.error("[ServiceWorker] Error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
	console.error("[ServiceWorker] Unhandled rejection:", event.reason);
});

// Handle messages from the main thread
self.addEventListener("message", (event) => {
	console.log("[ServiceWorker] Message received:", event.data);
	
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	} else if (event.data && event.data.type === "REGISTER_BACKGROUND_SYNC") {
		// Register background sync for mobile
		self.registration.sync.register(event.data.tag);
	}
});
