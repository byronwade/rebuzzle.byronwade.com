import { useState, useCallback } from "react";

export function useNotifications() {
	const [subscription, setSubscription] = useState<PushSubscription | null>(null);
	const [error, setError] = useState<string | null>(null);

	const subscriptionManager = useCallback(async (subscription: PushSubscription) => {
		try {
			const response = await fetch("/api/notifications/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					endpoint: subscription.endpoint,
					keys: {
						auth: subscription.getKey("auth") ? arrayBufferToBase64(subscription.getKey("auth")!) : "",
						p256dh: subscription.getKey("p256dh") ? arrayBufferToBase64(subscription.getKey("p256dh")!) : "",
					},
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to verify subscription");
			}

			return await response.json();
		} catch (err) {
			console.error("[Notifications] Subscription error:", err);
			throw err;
		}
	}, []);

	// ... rest of the hook implementation
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const binary = String.fromCharCode.apply(null, new Uint8Array(buffer) as any);
	return window.btoa(binary);
}
