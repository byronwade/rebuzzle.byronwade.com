"use client";

import { Bell, BellRing, Check, Loader2, Mail, Sparkles } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useCallback, useEffect, useState } from "react";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import {
  dailyReminderDialogBlurb,
  dailyReminderEnabledBlurb,
  PUZZLE_EMAIL_REMINDER_SHORT,
} from "@/lib/game/reminder-copy";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";


export function useNotificationBadge(props: any = {}) {

  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useIsClient();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    enabled: notificationsEnabled,
    isLoading: emailLoading,
    subscribe,
    unsubscribe,
  } = useEmailNotifications();
  const {
    notifications: inbox,
    unreadCount,
    refresh: refreshInbox,
    markRead,
  } = useInAppNotifications(isAuthenticated);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      void refreshInbox();
    }
  }, [isOpen, isAuthenticated, refreshInbox]);

  // Validate email format
  const validateEmail = useCallback((emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  }, []);

  const handleEnableClick = useCallback(async () => {
    // Prevent rapid clicks
    if (isSubmitting || emailLoading) return;

    if (isAuthenticated && user?.email) {
      // Authenticated user - subscribe directly
      setIsSubmitting(true);
      try {
        await subscribe(user.email);
      } catch {
        // Error handled in hook
      }
      setIsSubmitting(false);
    } else {
      // Guest - need to collect email
      setShowEmailDialog(true);
    }
  }, [isAuthenticated, user, subscribe, isSubmitting, emailLoading]);

  const handleDisableClick = useCallback(async () => {
    // Prevent rapid clicks
    if (isSubmitting || emailLoading) return;

    setIsSubmitting(true);
    try {
      await unsubscribe();
    } catch (_err) {
      // Error handled in hook
    }
    setIsSubmitting(false);

  }, [unsubscribe, isSubmitting, emailLoading]);

  const handleEmailSubmit = useCallback(async () => {
    // Clear previous errors
    setEmailError(null);

    // Validate email
    if (!guestEmail.trim()) {
      setEmailError("Email address is required");
      return;
    }

    if (!validateEmail(guestEmail.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribe(guestEmail.trim());
      setShowEmailDialog(false);
      setGuestEmail("");
      setEmailError(null);
    } catch (err) {
      // Error handled in hook, but set local error for dialog
      if (err instanceof Error) {
        setEmailError(err.message);
      }
    }
    setIsSubmitting(false);

  }, [guestEmail, validateEmail, subscribe]);

  const getBellIcon = () => {
    if (emailLoading) {
      return (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      );
    }

    if (notificationsEnabled) {
      return <BellRing className="h-5 w-5" />;
    }

    return <Bell className="h-5 w-5" />;
  };

  const getBellTooltip = () => {
    if (!mounted) {
      return "Notifications";
    }
    if (unreadCount > 0) {
      return `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;
    }
    if (notificationsEnabled) {
      return "Notifications · daily email on";
    }
    return "Notifications · get daily email reminders";
  };

  return {
    emailError,
    emailRegex,
    getBellIcon,
    getBellTooltip,
    guestEmail,
    handleDisableClick,
    handleEmailSubmit,
    handleEnableClick,
    isOpen,
    isSubmitting,
    mounted,
    setEmailError,
    setGuestEmail,
    setIsOpen,
    setIsSubmitting,
    setShowEmailDialog,
    showEmailDialog,
    validateEmail
  };
}
