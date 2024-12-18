"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

// Helper function to convert base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, "+")
		.replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function TestNotificationButton() {
	const { isSignedIn } = useAuth();
	const [hasPermission, setHasPermission] = useState(false);
	const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
	const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
	const [showInstructions, setShowInstructions] = useState(false);

	useEffect(() => {
		async function initializeNotifications() {
			console.log("[TestNotification] Component mounted");
			if ("Notification" in window) {
				const permission = Notification.permission;
				console.log("[TestNotification] Current notification permission:", permission);
				setHasPermission(permission === "granted");

				// Show instructions if notifications are denied
				if (permission === "denied") {
					setShowInstructions(true);
				}

				if ("serviceWorker" in navigator) {
					try {
						// Force update by unregistering existing service workers
						const registrations = await navigator.serviceWorker.getRegistrations();
						for (const registration of registrations) {
							await registration.unregister();
							console.log("[TestNotification] Unregistered existing service worker");
						}

						// Register new service worker with no caching
						const registration = await navigator.serviceWorker.register("/sw.js", {
							scope: "/",
							updateViaCache: "none",
						});
						console.log("[TestNotification] Service Worker registered:", registration);

						// Wait for the service worker to be ready
						await navigator.serviceWorker.ready;
						console.log("[TestNotification] Service worker is ready");

						setServiceWorkerRegistration(registration);

						// Get existing push subscription
						const subscription = await registration.pushManager.getSubscription();
						if (subscription) {
							console.log("[TestNotification] Found existing push subscription");
							setPushSubscription(subscription);
						}
					} catch (error) {
						console.error("[TestNotification] Service Worker registration failed:", error);
					}
				}
			} else {
				console.log("[TestNotification] Notifications not supported in this browser");
			}
		}

		void initializeNotifications();

		return () => {
			console.log("[TestNotification] Component unmounting");
		};
	}, []);

	const subscribeToPushNotifications = async () => {
		if (!serviceWorkerRegistration) {
			throw new Error("Service worker not registered");
		}

		try {
			// Get the VAPID public key
			const response = await fetch("/api/notifications/vapid-public-key");
			const { vapidPublicKey } = await response.json();

			if (!vapidPublicKey) {
				throw new Error("VAPID public key not found");
			}

			console.log("[TestNotification] Got VAPID public key:", vapidPublicKey);

			// Convert the VAPID key to Uint8Array using the helper function
			const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

			// Subscribe to push notifications
			const subscription = await serviceWorkerRegistration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey,
			});

			console.log("[TestNotification] Push subscription created:", subscription);

			// Save the subscription on the server
			const saveResponse = await fetch("/api/notifications/subscribe", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(subscription),
				});

			const saveData = await saveResponse.json();
			if (!saveData.success) {
				throw new Error(saveData.error || "Failed to save subscription");
			}

			setPushSubscription(subscription);
			return subscription;
		} catch (error) {
			console.error("[TestNotification] Error subscribing to push notifications:", error);
			throw error;
		}
	};

	const handleTest = async () => {
		console.log("[TestNotification] Test button clicked");
		console.log("[TestNotification] Auth status:", { isSignedIn });

		if (!isSignedIn) {
			console.log("[TestNotification] User not signed in");
			alert("Please sign in to enable notifications");
			return;
		}

		try {
			// Check if notifications are supported
			if (!("Notification" in window)) {
				console.error("[TestNotification] Notifications not supported");
				alert("Notifications are not supported in this browser");
				return;
			}

			// Request permission if not granted
			if (Notification.permission === "denied") {
				console.log("[TestNotification] Notifications are denied");
				setShowInstructions(true);
				return;
			}

			if (Notification.permission !== "granted") {
				console.log("[TestNotification] Requesting notification permission");
				const permission = await Notification.requestPermission();
				console.log("[TestNotification] Permission response:", permission);
				
				if (permission === "denied") {
					setShowInstructions(true);
					return;
				}
				
				if (permission !== "granted") {
					alert("Notification permission denied");
					return;
				}
				setHasPermission(true);
			}

			// Verify service worker registration
			if (!serviceWorkerRegistration) {
				console.error("[TestNotification] No service worker registration");
				alert("Service worker not registered. Please refresh the page.");
				return;
			}

			// Subscribe to push notifications if not already subscribed
			if (!pushSubscription) {
				console.log("[TestNotification] No push subscription found, creating one");
				await subscribeToPushNotifications();
			}

			// Try creating a simple notification first
			try {
				console.log("[TestNotification] Attempting to show direct notification");
				await serviceWorkerRegistration.showNotification("Test Notification", {
					body: "This is a test notification",
					icon: "/icon.svg",
					badge: "/icon.svg",
					tag: "test-notification",
					data: { url: "/" },
					requireInteraction: true,
				});
				console.log("[TestNotification] Direct notification sent successfully");
			} catch (error) {
				console.error("[TestNotification] Error showing direct notification:", error);
				throw error;
			}

			// Then try the API route
			console.log("[TestNotification] Sending test notification request");
			const response = await fetch("/api/notifications/test", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			console.log("[TestNotification] API response:", {
				status: response.status,
				ok: response.ok,
			});

			const data = await response.json();
			console.log("[TestNotification] API response data:", data);

			if (!data.success) {
				throw new Error(data.error || "Failed to send notification");
			}
		} catch (error) {
			console.error("[TestNotification] Error:", error);
			alert("Error sending notification: " + (error instanceof Error ? error.message : String(error)));
		}
	};

	if (!("Notification" in window)) {
		return null;
	}

	return (
		<>
			<Button 
				variant="ghost" 
				size="icon" 
				onClick={handleTest} 
				title={hasPermission ? "Send test notification" : "Enable notifications"}
			>
				<BellRing className="w-5 h-5" />
			</Button>

			<Dialog open={showInstructions} onOpenChange={setShowInstructions}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Enable Notifications</DialogTitle>
						<DialogDescription>
							<p className="mb-4">
								Notifications are currently blocked. To enable notifications, follow these steps:
							</p>
							<ol className="space-y-2 list-decimal list-inside">
								<li>Click the lock/info icon in the address bar (left of the URL)</li>
								<li>Click "Site settings"</li>
								<li>Find "Notifications"</li>
								<li>Change it from "Block" to "Ask" or "Allow"</li>
								<li>Refresh this page</li>
							</ol>
							<p className="mt-4">
								If you don&apos;t see the option there:
							</p>
							<ol className="space-y-2 list-decimal list-inside">
								<li>Open Chrome Settings (three dots menu)</li>
								<li>Go to "Privacy and security"</li>
								<li>Click "Site Settings"</li>
								<li>Click "Notifications"</li>
								<li>Find this site and change to "Ask" or "Allow"</li>
							</ol>
							<p className="mt-4">
								Also check Windows notification settings:
							</p>
							<ol className="space-y-2 list-decimal list-inside">
								<li>Open Windows Settings</li>
								<li>Go to System > Notifications</li>
								<li>Make sure notifications are enabled for Chrome</li>
								<li>Scroll down and ensure Chrome is allowed to show notifications</li>
							</ol>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	);
}
