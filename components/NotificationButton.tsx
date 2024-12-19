"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, useUser } from "@clerk/nextjs";

// Helper function to convert base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function NotificationButton() {
	const { userId, isSignedIn } = useAuth();
	const { user } = useUser();
	const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
	const [showInstructions, setShowInstructions] = useState(false);
	const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
	const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [retryTimeout, setRetryTimeout] = useState<number>(1000);
	const [email, setEmail] = useState(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("notification_email") || "";
		}
		return "";
	});

	useEffect(() => {
		let mounted = true;

		async function initializeNotifications() {
			console.log("[Notifications] Component mounted, initializing...");

			if (!mounted) return;

			if (!("Notification" in window)) {
				console.log("[Notifications] Notifications API not supported");
				setError("Notifications are not supported in this browser.");
				return;
			}

			if (!("serviceWorker" in navigator)) {
				console.log("[Notifications] Service Worker API not supported");
				setError("Service Workers are not supported in this browser.");
				return;
			}

			const permission = Notification.permission;
			console.log("[Notifications] Current notification permission:", permission);
			if (!mounted) return;
			setNotificationsEnabled(permission === "granted");

			if (permission === "denied") {
				console.log("[Notifications] Notifications are denied by user");
				if (!mounted) return;
				setShowInstructions(true);
				return;
			}

			try {
				// First check if we already have an active service worker
				console.log("[Notifications] Checking for existing service worker");
				const existingRegistration = await navigator.serviceWorker.getRegistration("/");

				if (!mounted) return;

				if (existingRegistration?.active) {
					console.log("[Notifications] Found active service worker:", {
						state: existingRegistration.active.state,
						scriptURL: existingRegistration.active.scriptURL,
					});

					setServiceWorkerRegistration(existingRegistration);

					// Check for existing subscription
					const subscription = await existingRegistration.pushManager.getSubscription();
					if (!mounted) return;

					if (subscription) {
						console.log("[Notifications] Found existing push subscription:", {
							endpoint: subscription.endpoint,
							expirationTime: subscription.expirationTime,
						});
						setPushSubscription(subscription);
						setNotificationsEnabled(true);
					} else {
						console.log("[Notifications] No existing push subscription found");
					}
					return;
				}

				console.log("[Notifications] No active service worker found, registering new one");
				const registration = await navigator.serviceWorker.register("/sw.js", {
					scope: "/",
					updateViaCache: "none",
				});

				if (!mounted) return;

				console.log("[Notifications] Service Worker registered:", {
					scope: registration.scope,
					state: registration.active?.state || "none",
				});

				// Wait for the service worker to be ready
				await navigator.serviceWorker.ready;
				if (!mounted) return;

				console.log("[Notifications] Service worker is ready");
				setServiceWorkerRegistration(registration);

				// Check for subscription after registration
				const subscription = await registration.pushManager.getSubscription();
				if (!mounted) return;

				if (subscription) {
					console.log("[Notifications] Found push subscription after registration");
					setPushSubscription(subscription);
					setNotificationsEnabled(true);
				}
			} catch (error) {
				if (!mounted) return;
				console.error("[Notifications] Service Worker initialization failed:", {
					error,
					message: error instanceof Error ? error.message : "Unknown error",
					stack: error instanceof Error ? error.stack : undefined,
				});
				setError("Failed to initialize notifications. Please refresh the page.");
			}
		}

		void initializeNotifications();

		// Cleanup function
		return () => {
			mounted = false;
			console.log("[Notifications] Component unmounting, cleaning up");
		};
	}, []);

	// Save email to localStorage when it changes
	useEffect(() => {
		if (email) {
			localStorage.setItem("notification_email", email);
		} else {
			localStorage.removeItem("notification_email");
		}
	}, [email]);

	const subscribeToPushNotifications = async () => {
		console.log("[Notifications] Starting push subscription process");

		if (!serviceWorkerRegistration) {
			console.error("[Notifications] No service worker registration available");
			throw new Error("Service worker not registered");
		}

		try {
			setError(null);
			setIsLoading(true);

			console.log("[Notifications] Fetching VAPID public key");
			// Get the VAPID public key
			const response = await fetch("/api/notifications/vapid-public-key");
			console.log("[Notifications] VAPID key response status:", response.status);

			const data = await response.json();
			console.log("[Notifications] VAPID key response data:", {
				hasKey: !!data.vapidPublicKey,
				keyLength: data.vapidPublicKey?.length,
			});

			const { vapidPublicKey } = data;
			if (!vapidPublicKey) {
				console.error("[Notifications] No VAPID key in response");
				throw new Error("VAPID public key not found");
			}

			console.log("[Notifications] Converting VAPID key to Uint8Array");
			// Convert the VAPID key to Uint8Array using the helper function
			const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
			console.log("[Notifications] VAPID key converted successfully");

			console.log("[Notifications] Requesting push subscription from browser");
			// Subscribe to push notifications
			const subscription = await serviceWorkerRegistration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey,
			});

			console.log("[Notifications] Push subscription details:", {
				endpoint: subscription.endpoint,
				hasAuth: !!subscription.toJSON().keys?.auth,
				hasP256dh: !!subscription.toJSON().keys?.p256dh,
			});

			return subscription;
		} catch (error) {
			console.error("[Notifications] Error in subscribeToPushNotifications:", {
				error,
				message: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
				serviceWorkerState: serviceWorkerRegistration?.active?.state,
			});
			setError(error instanceof Error ? error.message : "Failed to create subscription");
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const handleClick = async () => {
		try {
			const userEmail = user?.primaryEmailAddress?.emailAddress;
			console.log("[Notifications] Starting notification subscription process", {
				isSignedIn,
				userId,
				userEmail,
				storedEmail: email,
				user: user
					? {
							id: user.id,
							hasEmail: !!user.primaryEmailAddress,
							emailAddress: user.primaryEmailAddress?.emailAddress,
					  }
					: null,
			});
			setError(null);

			// Check if notifications are supported
			if (!("Notification" in window)) {
				const msg = "Notifications are not supported in this browser";
				console.error("[Notifications] " + msg);
				setError(msg);
				return;
			}

			// Check if service workers are supported
			if (!("serviceWorker" in navigator)) {
				const msg = "Service Workers are not supported in this browser";
				console.error("[Notifications] " + msg);
				setError(msg);
				return;
			}

			// Check if push is supported
			if (!("PushManager" in window)) {
				const msg = "Push notifications are not supported in this browser";
				console.error("[Notifications] " + msg);
				setError(msg);
				return;
			}

			if (Notification.permission === "denied") {
				console.log("[Notifications] Permission denied, showing instructions");
				setShowInstructions(true);
				return;
			}

			// Get email first if we don't have it
			let currentEmail = userEmail || email;

			// If we have a Clerk email, update the stored email
			if (isSignedIn && userEmail) {
				console.log("[Notifications] Using Clerk user email:", {
					userEmail,
					previousEmail: email,
					isSignedIn,
					userId,
				});
				setEmail(userEmail);
			}

			// If we still don't have an email, prompt for one
			if (!currentEmail) {
				console.log("[Notifications] No email found, prompting user");
				const promptEmail = window.prompt("Please enter your email to receive notifications:");
				console.log("[Notifications] User email input:", promptEmail);

				if (!promptEmail) {
					console.log("[Notifications] User cancelled email input");
					return;
				}

				// Validate email format
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(promptEmail)) {
					console.error("[Notifications] Invalid email format:", promptEmail);
					setError("Please enter a valid email address.");
					return;
				}

				console.log("[Notifications] Setting prompted email:", promptEmail);
				setEmail(promptEmail);
				currentEmail = promptEmail;
			}

			// Final email check
			if (!currentEmail) {
				console.error("[Notifications] No email available after all checks");
				setError("Email address is required for notifications.");
				return;
			}

			console.log("[Notifications] Final email state:", {
				currentEmail,
				storedEmail: email,
				isSignedIn,
				userId,
				clerkEmail: userEmail,
			});

			console.log("[Notifications] Checking notification permission:", Notification.permission);
			if (Notification.permission !== "granted") {
				console.log("[Notifications] Requesting permission...");
				const permission = await Notification.requestPermission();
				console.log("[Notifications] Permission response:", permission);

				if (permission === "denied") {
					console.log("[Notifications] Permission denied by user");
					setShowInstructions(true);
					return;
				}
				if (permission !== "granted") {
					console.log("[Notifications] Permission not granted:", permission);
					return;
				}
			}

			// Verify service worker registration
			console.log("[Notifications] Checking service worker registration");
			if (!serviceWorkerRegistration) {
				console.error("[Notifications] No service worker registration found");

				// Try to register service worker again
				try {
					console.log("[Notifications] Attempting to register service worker");
					const registration = await navigator.serviceWorker.register("/sw.js", {
						scope: "/",
						updateViaCache: "none",
					});

					// Wait for the service worker to be ready
					await navigator.serviceWorker.ready;
					console.log("[Notifications] Service worker registered:", {
						scope: registration.scope,
						state: registration.active?.state || "none",
						ready: !!registration.active,
					});
					setServiceWorkerRegistration(registration);
				} catch (swError) {
					console.error("[Notifications] Service worker registration failed:", swError);
					setError("Failed to register service worker. Please refresh the page.");
					return;
				}
			}

			// Double check service worker registration
			if (!serviceWorkerRegistration?.active) {
				console.error("[Notifications] Service worker is not active");
				setError("Service worker is not ready. Please refresh the page.");
				return;
			}

			// Subscribe to push notifications if not already subscribed
			if (!pushSubscription) {
				console.log("[Notifications] Creating new subscription with email:", currentEmail);
				let subscription;
				try {
					subscription = await subscribeToPushNotifications();
					console.log("[Notifications] Subscription created:", {
						endpoint: subscription.endpoint,
						hasAuth: !!subscription.toJSON().keys?.auth,
						hasP256dh: !!subscription.toJSON().keys?.p256dh,
						email: currentEmail,
					});

					// Send the subscription request with the current email
					const subscriptionData = {
						subscription: subscription.toJSON(),
						email: currentEmail,
						userId: isSignedIn ? userId : undefined,
						sendWelcomeEmail: true,
					};

					console.log("[Notifications] Sending subscription to server:", subscriptionData);

					const saveResponse = await fetch("/api/notifications/subscribe", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(subscriptionData),
					});

					console.log("[Notifications] Server response status:", saveResponse.status);
					const saveData = await saveResponse.json();
					console.log("[Notifications] Server response data:", {
						...saveData,
						sentEmail: currentEmail,
						userId: isSignedIn ? userId : undefined,
					});

					if (!saveResponse.ok || !saveData.success) {
						const errorMessage = saveData.error || "Failed to save subscription";
						console.error("[Notifications] Server error:", {
							status: saveResponse.status,
							error: errorMessage,
							data: saveData,
							sentEmail: currentEmail,
						});
						throw new Error(errorMessage);
					}

					console.log("[Notifications] Subscription saved successfully with email:", currentEmail);
					setPushSubscription(subscription);
				} catch (error) {
					console.error("[Notifications] Subscription error:", {
						error,
						email: currentEmail,
						userId: isSignedIn ? userId : undefined,
					});
					throw error;
				}
			} else {
				console.log("[Notifications] Using existing subscription:", {
					endpoint: pushSubscription.endpoint,
					expirationTime: pushSubscription.expirationTime,
					email: currentEmail,
				});
			}

			console.log("[Notifications] Enabling notifications");
			setNotificationsEnabled(true);

			// Show a native notification
			if (serviceWorkerRegistration?.active) {
				try {
					console.log("[Notifications] Showing confirmation notification");
					await serviceWorkerRegistration.showNotification("Notifications enabled", {
						body: "You'll receive a notification at 8am when a new puzzle is available.",
						icon: "/icon-192x192.png",
						badge: "/icon-192x192.png",
						tag: "notifications-enabled",
					});
					console.log("[Notifications] Confirmation notification shown");
				} catch (notifError) {
					console.error("[Notifications] Failed to show confirmation notification:", notifError);
					// Don't set an error here as the subscription was successful
				}
			} else {
				console.warn("[Notifications] Could not show confirmation notification - service worker not active");
			}
		} catch (error) {
			console.error("[Notifications] Error in handleClick:", {
				error,
				message: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
				email: email,
				userId: isSignedIn ? userId : undefined,
			});
			setError(error instanceof Error ? error.message : "Failed to enable notifications");
			if (Notification.permission === "granted") {
				try {
					new Notification("Error", {
						body: "There was a problem enabling notifications. Please try again.",
						icon: "/icon-192x192.png",
					});
				} catch (notifError) {
					console.error("[Notifications] Failed to show error notification:", notifError);
				}
			}
		}
	};

	const handleTest = async () => {
		try {
			setError(null);
			const response = await fetch("/api/notifications/test", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to send test notification");
			}

			const data = await response.json();
			if (!data.success) {
				throw new Error(data.error || "Failed to send test notification");
			}
		} catch (error) {
			console.error("[Notifications] Error testing notifications:", error);
			setError(error instanceof Error ? error.message : "Failed to send test notification");
			if (Notification.permission === "granted") {
				new Notification("Error", {
					body: "There was a problem sending the test notification.",
					icon: "/icon-192x192.png",
				});
			}
		}
	};

	if (!("Notification" in window)) {
		return null;
	}

	return (
		<div className="flex gap-2 items-center">
			<Button variant="ghost" size="icon" onClick={handleClick} title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"} className="block" disabled={isLoading}>
				{notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
			</Button>
			{notificationsEnabled && (
				<Button variant="ghost" size="icon" onClick={handleTest} title="Send test notification" className="block" disabled={isLoading}>
					<Send className="h-5 w-5" />
				</Button>
			)}
			{error && <span className="text-sm text-red-500">{error}</span>}

			<Dialog open={showInstructions} onOpenChange={setShowInstructions}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Enable Notifications</DialogTitle>
						<DialogDescription>
							<p className="mb-4">Notifications are currently blocked. To enable notifications, follow these steps:</p>
							<ol className="space-y-2 list-decimal list-inside">
								<li>Click the lock/info icon in the address bar (left of the URL)</li>
								<li>Click "Site settings"</li>
								<li>Find "Notifications"</li>
								<li>Change it from "Block" to "Ask" or "Allow"</li>
								<li>Refresh this page</li>
							</ol>
							<p className="mt-4">If you don&apos;t see the option there:</p>
							<ol className="space-y-2 list-decimal list-inside">
								<li>Open your browser settings</li>
								<li>Go to "Privacy and security"</li>
								<li>Click "Site Settings"</li>
								<li>Click "Notifications"</li>
								<li>Find this site and change to "Ask" or "Allow"</li>
							</ol>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</div>
	);
}
