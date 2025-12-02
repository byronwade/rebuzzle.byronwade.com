"use client";

import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "mobile_app_prompt_dismissed";
const _DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function MobileAppPrompt() {
  const _isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [_isMounted, setIsMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // PWA install prompt handler
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Disabled for now - still working on it
  // useEffect(() => {
  //   if (!(isMounted && isMobile)) return;

  //   // Check if app is already installed (PWA)
  //   const isStandalone =
  //     window.matchMedia("(display-mode: standalone)").matches ||
  //     (window.navigator as { standalone?: boolean }).standalone ||
  //     document.referrer.includes("android-app://");

  //   if (isStandalone) {
  //     return; // App is already installed, don't show prompt
  //   }

  //   // Check if user has dismissed this prompt recently
  //   const dismissed = localStorage.getItem(STORAGE_KEY);
  //   if (dismissed) {
  //     const dismissedTime = Number.parseInt(dismissed, 10);
  //     const now = Date.now();
  //     if (now - dismissedTime < DISMISS_DURATION) {
  //       return; // Still within dismiss period
  //     }
  //   }

  //   // Don't show if user is actively playing (check for game elements)
  //   const checkGameActive = () => {
  //     // Check for game board, keyboard, or guess boxes
  //     const hasGameElements =
  //       document.querySelector("[data-game-board]") !== null ||
  //       document.querySelector("[data-keyboard]") !== null ||
  //       document.querySelector("[data-guess-boxes]") !== null ||
  //       document.querySelector('input[type="text"]:focus') !== null;

  //     return hasGameElements;
  //   };

  //   // Show dialog after a delay, but only if not actively playing
  //   const timer = setTimeout(() => {
  //     // Double-check game isn't active and page is fully loaded
  //     if (!checkGameActive() && document.readyState === "complete") {
  //       setIsOpen(true);
  //     }
  //   }, 4000); // Delay to let game load and user start playing if they want

  //   return () => clearTimeout(timer);
  // }, [isMounted, isMobile]);

  const handleDismiss = (permanent = false) => {
    setIsOpen(false);
    if (permanent) {
      // Store dismissal timestamp
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        handleDismiss(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDownload = (platform: "ios" | "android") => {
    // Track download click
    if (
      typeof window !== "undefined" &&
      "gtag" in window &&
      typeof (window as { gtag?: unknown }).gtag === "function"
    ) {
      (
        window as {
          gtag: (
            command: string,
            targetId: string,
            config: { event_category: string; event_label: string }
          ) => void;
        }
      ).gtag("event", "app_download_click", {
        event_category: "engagement",
        event_label: platform,
      });
    }

    if (platform === "ios") {
      // iOS App Store link (update with your actual app ID when available)
      // For now, link to PWA install instructions or App Store when ready
      const appStoreUrl =
        process.env.NEXT_PUBLIC_IOS_APP_URL || "https://apps.apple.com/app/rebuzzle";
      window.open(appStoreUrl, "_blank");
    } else {
      // Google Play Store link (update with your actual app ID when available)
      // For now, link to PWA install instructions or Play Store when ready
      const playStoreUrl =
        process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
        "https://play.google.com/store/apps/details?id=com.rebuzzle.app";
      window.open(playStoreUrl, "_blank");
    }
    handleDismiss(true);
  };

  // Disabled for now - still working on it
  return null;

  // TODO: Re-enable when mobile app is ready
  // The UI implementation is preserved below for future use
}
