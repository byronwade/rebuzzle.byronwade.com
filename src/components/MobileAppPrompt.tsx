"use client";

import { Download, ExternalLink, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "mobile_app_prompt_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function MobileAppPrompt() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

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
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
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
        process.env.NEXT_PUBLIC_IOS_APP_URL ||
        "https://apps.apple.com/app/rebuzzle";
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

  // Detect iOS vs Android
  const isIOS =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid =
    typeof window !== "undefined" && /Android/.test(navigator.userAgent);

  // if (!(isMounted && isMobile && isOpen)) {
  //   return null;
  // }

  return (
    <Dialog
      onOpenChange={(open) => !open && handleDismiss(false)}
      open={isOpen}
    >
      <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-md">
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white">
          {/* Close button */}
          <button
            aria-label="Close"
            className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-1.5 transition-colors hover:bg-white/30"
            onClick={() => handleDismiss(false)}
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Header */}
          <div className="p-4 pb-3 sm:p-6 sm:pb-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:h-12 sm:w-12">
                <Smartphone className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="mb-0 font-bold text-white text-lg sm:text-xl">
                  Get the Rebuzzle App
                </DialogTitle>
                <DialogDescription className="mt-1 text-purple-100 text-xs sm:text-sm">
                  Play faster, smoother, and offline
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
            <div className="space-y-2 text-purple-50 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white" />
                <p>Faster loading and smoother gameplay</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white" />
                <p>Play offline - no internet needed</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white" />
                <p>Push notifications for daily puzzles</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white" />
                <p>Better performance and battery life</p>
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {/* PWA Install button (if available) */}
              {deferredPrompt && (
                <Button
                  className="h-11 w-full bg-white font-semibold text-purple-600 hover:bg-purple-50 sm:h-12"
                  onClick={handleInstallPWA}
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Install App</span>
                </Button>
              )}

              {/* Native app download buttons */}
              {isIOS ? (
                <Button
                  className="h-11 w-full bg-white font-semibold text-purple-600 hover:bg-purple-50 sm:h-12"
                  onClick={() => handleDownload("ios")}
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Download for iOS</span>
                  <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              ) : isAndroid ? (
                <Button
                  className="h-11 w-full bg-white font-semibold text-purple-600 hover:bg-purple-50 sm:h-12"
                  onClick={() => handleDownload("android")}
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Download for Android</span>
                  <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              ) : deferredPrompt ? null : (
                <>
                  <Button
                    className="h-11 w-full bg-white font-semibold text-purple-600 hover:bg-purple-50 sm:h-12"
                    onClick={() => handleDownload("ios")}
                    size="lg"
                  >
                    <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Download for iOS</span>
                    <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    className="h-11 w-full border border-white/20 bg-white/10 font-semibold text-white hover:bg-white/20 sm:h-12"
                    onClick={() => handleDownload("android")}
                    size="lg"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Download for Android</span>
                    <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Dismiss options */}
            <div className="flex items-center justify-center gap-3 border-white/20 border-t pt-2 sm:gap-4">
              <button
                className="text-purple-100 text-xs transition-colors hover:text-white sm:text-sm"
                onClick={() => handleDismiss(false)}
              >
                Maybe later
              </button>
              <span className="text-purple-200">•</span>
              <button
                className="text-purple-100 text-xs transition-colors hover:text-white sm:text-sm"
                onClick={() => handleDismiss(true)}
              >
                Don't show again
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
