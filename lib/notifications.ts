import { unstable_cache } from "next/cache";
import webpush from "web-push";

interface PushSubscriptionKeys {
	auth?: string;
	p256dh?: string;
}

interface WebPushSubscription {
	endpoint: string;
	keys?: PushSubscriptionKeys;
}

// Configure web-push with VAPID keys
webpush.setVapidDetails("mailto:notifications@rebuzzle.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "", process.env.VAPID_PRIVATE_KEY || "");

interface PushNotificationPayload {
	subscription: {
		endpoint: string;
		keys: {
			auth: string;
			p256dh: string;
		};
	};
	title: string;
	message: string;
	icon?: string;
	badge?: string;
	data?: Record<string, unknown>;
}

export async function sendPushNotification({ subscription, title, message, icon = "/icon-192x192.png", badge = "/icon-192x192.png", data = {} }: PushNotificationPayload): Promise<void> {
	try {
		const payload = JSON.stringify({
			title,
			body: message,
			icon,
			badge,
			data: {
				url: "/",
				...data,
			},
		});

		await webpush.sendNotification(
			{
				endpoint: subscription.endpoint,
				keys: {
					auth: subscription.keys.auth,
					p256dh: subscription.keys.p256dh,
				},
			},
			payload
		);
	} catch (error) {
		console.error("[Notifications] Error sending push notification:", error);
		throw error;
	}
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	try {
		console.log("[Notifications] Starting service worker registration");
		if (!("serviceWorker" in navigator)) {
			console.error("[Notifications] Service workers not supported");
			return null;
		}

		// First check if there's an existing registration
		const existingRegistration = await navigator.serviceWorker.getRegistration();
		if (existingRegistration?.active) {
			console.log("[Notifications] Found existing service worker registration");
			return existingRegistration;
		}

		console.log("[Notifications] Registering new service worker");
		const registration = await navigator.serviceWorker.register("/sw.js", {
			scope: "/",
		});

		console.log("[Notifications] Service worker registration successful:", registration);

		// Wait for the service worker to be ready
		if (registration.installing) {
			console.log("[Notifications] Service worker installing");
			await new Promise<void>((resolve) => {
				registration.installing?.addEventListener("statechange", (e) => {
					if ((e.target as ServiceWorker).state === "activated") {
						console.log("[Notifications] Service worker activated");
						resolve();
					}
				});
			});
		}

		return registration;
	} catch (error) {
		console.error("[Notifications] Service worker registration failed:", error);
		return null;
	}
}

export async function requestNotificationPermission(): Promise<boolean> {
	try {
		console.log("[Notifications] Checking notification support...");
		if (!("Notification" in window)) {
			console.log("[Notifications] Browser does not support notifications");
			return false;
		}

		console.log("[Notifications] Current permission status:", Notification.permission);
		let permission = Notification.permission;

		if (permission === "default") {
			console.log("[Notifications] Requesting permission...");
			permission = await Notification.requestPermission();
			console.log("[Notifications] Permission response:", permission);
		}

		if (permission === "granted") {
			console.log("[Notifications] Permission granted, registering service worker...");
			const registration = await registerServiceWorker();
			if (!registration) {
				console.error("[Notifications] Failed to register service worker");
				return false;
			}

			console.log("[Notifications] Registering push subscription...");
			await registerPushSubscription(registration);
			return true;
		}

		console.log("[Notifications] Permission not granted:", permission);
		return false;
	} catch (error) {
		console.error("[Notifications] Error in requestNotificationPermission:", error);
		return false;
	}
}

async function registerPushSubscription(registration: ServiceWorkerRegistration): Promise<void> {
	try {
		console.log("[Notifications] Starting push subscription registration...");

		if (!("PushManager" in window)) {
			console.error("[Notifications] Push notifications not supported");
			throw new Error("Push notifications are not supported");
		}

		console.log("[Notifications] Checking existing subscription...");
		const existingSubscription = await registration.pushManager.getSubscription();

		if (existingSubscription) {
			console.log("[Notifications] Found existing subscription:", existingSubscription);
			await savePushSubscription(existingSubscription);
			return;
		}

		console.log("[Notifications] No existing subscription found, creating new one...");
		// Get VAPID key from API instead of environment variable
		const response = await fetch("/api/notifications/vapid-public-key");
		const { vapidPublicKey } = await response.json();

		if (!vapidPublicKey) {
			throw new Error("VAPID public key not found");
		}

		console.log("[Notifications] Using VAPID key:", vapidPublicKey);

		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: vapidPublicKey,
		});

		console.log("[Notifications] New subscription created:", subscription);
		await savePushSubscription(subscription);
	} catch (error) {
		console.error("[Notifications] Error in registerPushSubscription:", error);
		throw error;
	}
}

const savePushSubscription = unstable_cache(
	async (subscription: PushSubscription): Promise<boolean> => {
		try {
			console.log("[Notifications] Preparing to save subscription...");
			const subscriptionData: WebPushSubscription = {
				endpoint: subscription.endpoint,
				keys: {
					auth: subscription.toJSON().keys?.auth,
					p256dh: subscription.toJSON().keys?.p256dh,
				},
			};

			console.log("[Notifications] Subscription data prepared:", subscriptionData);

			const response = await fetch("/api/notifications/subscribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(subscriptionData),
			});

			console.log("[Notifications] Save subscription response:", {
				status: response.status,
				ok: response.ok,
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error("[Notifications] Failed to save subscription:", errorData);
				throw new Error("Failed to save push subscription");
			}

			const responseData = await response.json();
			console.log("[Notifications] Subscription saved successfully:", responseData);
			return true;
		} catch (error) {
			console.error("[Notifications] Error saving push subscription:", error);
			return false;
		}
	},
	["push-subscription"],
	{ revalidate: 86400 } // Cache for 24 hours
);
