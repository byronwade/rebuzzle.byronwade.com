"use client";

import {
  Check,
  ChevronRight,
  FlaskConical,
  Gamepad2,
  Lock,
  Palette,
  Save,
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  Trash2,
  Trophy,
} from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { EmailNotificationForm } from "@/components/EmailNotificationForm";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useVisualTheme } from "@/components/VisualThemeProvider";
import { useToast } from "@/hooks/use-toast";
import {
  type AppSettings,
  createDefaultAppSettings,
  readAppSettings,
  writeAppSettings,
} from "@/lib/app-settings";
import type { AvatarPreferences } from "@/lib/avatar";
import { isDevModeEnabled, setDevModeEnabled } from "@/lib/dev-mode";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { cn } from "@/lib/utils";
import { VISUAL_THEME_META, VISUAL_THEMES, type VisualTheme } from "@/lib/visual-theme";
import { fail } from "@/lib/fail";


export function useSettingsPage(props: any = {}) {

  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { visualTheme, setVisualTheme, mounted: themeMounted } = useVisualTheme();
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() =>
    createDefaultAppSettings(theme === "dark")
  );
  const [savedSettings, setSavedSettings] = useState(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile editing state
  const [_profileForm, setProfileForm] = useState({
    username: user?.username || "",
    avatarColorIndex: undefined as number | undefined,
    avatarCustomInitials: undefined as string | undefined,
  });
  const [_profileErrors, _setProfileErrors] = useState<{
    username?: string;
  }>({});
  const [_isUpdatingProfile, _setIsUpdatingProfile] = useState(false);
  const [_avatarPreferences, setAvatarPreferences] = useState<AvatarPreferences | null>(null);

  useEffect(() => {
    setMounted(true);
    setDevMode(isDevModeEnabled());
  }, []);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await fetch("/api/user/profile", {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setProfileForm({
                username: data.user.username || user.username || "",
                avatarColorIndex: data.user.avatarColorIndex,
                avatarCustomInitials: data.user.avatarCustomInitials,
              });
              setAvatarPreferences({
                colorIndex: data.user.avatarColorIndex,
                customInitials: data.user.avatarCustomInitials,
              });
            }
          }
        } catch (error) {
          console.error("Failed to load profile:", error);
        }
      }
    };

    void loadProfile();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (mounted && theme) {
      setSettings((prev) => ({ ...prev, darkMode: theme === "dark" }));
    }
  }, [theme, mounted]);

  useEffect(() => {
    // Load settings from localStorage
    const storedSettings = readAppSettings(
      localStorage,
      createDefaultAppSettings(theme === "dark")
    );
    setSettings(storedSettings);
    setSavedSettings(storedSettings);
  }, []);

  useEffect(() => {
    // Check if settings have changed
    const changed = JSON.stringify(settings) !== JSON.stringify(savedSettings);
    setHasUnsavedChanges(changed);
  }, [settings, savedSettings]);

  useEffect(() => {
    // Warn before leaving page with unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = () => {
    writeAppSettings(settings);
    setSavedSettings(settings);
    setHasUnsavedChanges(false);
    void playInterfaceSound("notification");
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      const defaultSettings = createDefaultAppSettings();
      setSettings(defaultSettings);
      setSavedSettings(defaultSettings);
      setHasUnsavedChanges(false);
      writeAppSettings(defaultSettings);
      void playInterfaceSound("sound-on", { ignorePreference: true });
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to default.",
      });
    }
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear ALL your game data? This cannot be undone!")) {
      localStorage.removeItem("userStats");
      localStorage.removeItem("gameCompletion");
      localStorage.removeItem("appSettings");
      toast({
        title: "Data Cleared",
        description: "All your game data has been deleted.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  const validatePasswordForm = (): boolean => {
    const nextErrors: typeof passwordErrors = {};

    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      nextErrors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 6) {
      nextErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      nextErrors.newPassword = "New password must be different from current password";
    }

    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!(isAuthenticated && user)) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to change your password.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        fail("Failed to change password");
      }

      const data = await response.json();

      // Clear form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});

      toast({
        title: "Password Changed",
        description:
          "Your password has been changed successfully. A confirmation email has been sent.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";

      // Check if it's a current password error
      if (errorMessage.includes("Current password")) {
        setPasswordErrors({ currentPassword: errorMessage });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
    setIsChangingPassword(false);

  };


  return {
    _avatarPreferences,
    _isUpdatingProfile,
    _profileErrors,
    _profileForm,
    _setIsUpdatingProfile,
    _setProfileErrors,
    changed,
    data,
    defaultSettings,
    devMode,
    errorMessage,
    handleBeforeUnload,
    handleClearData,
    handlePasswordChange,
    handleReset,
    handleSave,
    hasUnsavedChanges,
    isChangingPassword,
    loadProfile,
    mounted,
    nextErrors,
    passwordErrors,
    passwordForm,
    response,
    router,
    savedSettings,
    setAvatarPreferences,
    setDevMode,
    setHasUnsavedChanges,
    setIsChangingPassword,
    setMounted,
    setPasswordErrors,
    setPasswordForm,
    setProfileForm,
    setSavedSettings,
    setSettings,
    settings,
    storedSettings,
    validatePasswordForm
  };
}
