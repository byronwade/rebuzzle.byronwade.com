"use client";

import {
  Lock,
  Moon,
  Save,
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
import { useToast } from "@/hooks/use-toast";
import type { AvatarPreferences } from "@/lib/avatar";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({
    notifications: false,
    sound: true,
    darkMode: theme === "dark",
    emailNotifications: false,
    pushNotifications: false,
    showHints: true,
  });
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
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    avatarColorIndex: undefined as number | undefined,
    avatarCustomInitials: undefined as string | undefined,
  });
  const [profileErrors, setProfileErrors] = useState<{
    username?: string;
  }>({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [avatarPreferences, setAvatarPreferences] =
    useState<AvatarPreferences | null>(null);

  useEffect(() => {
    setMounted(true);
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
    const saved = localStorage.getItem("appSettings");
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
        setSavedSettings(parsedSettings);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
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
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = () => {
    localStorage.setItem("appSettings", JSON.stringify(settings));
    setSavedSettings(settings);
    setHasUnsavedChanges(false);
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      const defaultSettings = {
        notifications: false,
        sound: true,
        darkMode: false,
        emailNotifications: false,
        pushNotifications: false,
        showHints: true,
      };
      setSettings(defaultSettings);
      localStorage.setItem("appSettings", JSON.stringify(defaultSettings));
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to default.",
      });
    }
  };

  const handleClearData = () => {
    if (
      confirm(
        "Are you sure you want to clear ALL your game data? This cannot be undone!"
      )
    ) {
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
    const errors: typeof passwordErrors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword =
        "New password must be different from current password";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to change password";

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
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-purple-600" />
            <h1 className="font-semibold text-base md:text-lg">Settings</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Manage your preferences and game settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Email Notifications Form */}
          <EmailNotificationForm />

          {/* Gameplay */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
              <Smartphone className="h-5 w-5" />
              Gameplay
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="cursor-pointer text-base" htmlFor="sound">
                    Sound Effects
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Play sounds for correct/incorrect answers
                  </p>
                </div>
                <Switch
                  checked={settings.sound}
                  id="sound"
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sound: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    className="cursor-pointer text-base"
                    htmlFor="show-hints"
                  >
                    Show Hints
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Display hint button during gameplay
                  </p>
                </div>
                <Switch
                  checked={settings.showHints}
                  id="show-hints"
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, showHints: checked })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
              <Moon className="h-5 w-5" />
              Appearance
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    className="cursor-pointer text-base"
                    htmlFor="dark-mode"
                  >
                    Dark Mode
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Switch to dark theme
                  </p>
                </div>
                <Switch
                  checked={settings.darkMode}
                  disabled={!mounted}
                  id="dark-mode"
                  onCheckedChange={(checked) => {
                    setTheme(checked ? "dark" : "light");
                    setSettings({ ...settings, darkMode: checked });
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Password Change - Only for authenticated users */}
          {isAuthenticated && user && (
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
                <Lock className="h-5 w-5" />
                Change Password
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm" htmlFor="current-password">
                    Current Password
                  </Label>
                  <Input
                    className="mt-1"
                    id="current-password"
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="Enter your current password"
                    type="password"
                    value={passwordForm.currentPassword}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-red-600 text-sm">
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm" htmlFor="new-password">
                    New Password
                  </Label>
                  <Input
                    className="mt-1"
                    id="new-password"
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Enter your new password (min. 6 characters)"
                    type="password"
                    value={passwordForm.newPassword}
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-red-600 text-sm">
                      {passwordErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm" htmlFor="confirm-password">
                    Confirm New Password
                  </Label>
                  <Input
                    className="mt-1"
                    id="confirm-password"
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handlePasswordChange();
                      }
                    }}
                    placeholder="Confirm your new password"
                    type="password"
                    value={passwordForm.confirmPassword}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-red-600 text-sm">
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full sm:w-auto"
                  disabled={isChangingPassword}
                  onClick={handlePasswordChange}
                  size="sm"
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </Card>
          )}

          {/* Data & Privacy */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
              <Shield className="h-5 w-5" />
              Data & Privacy
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium">Your Data</h3>
                <p className="mb-4 text-gray-600 text-sm">
                  Your game statistics are stored locally on your device. We
                  don't sell or share your data.
                </p>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleClearData}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Game Data
                </Button>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!hasUnsavedChanges}
              onClick={handleSave}
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {hasUnsavedChanges ? "Save Settings" : "Saved"}
            </Button>
            <Button onClick={handleReset} size="lg" variant="outline">
              Reset to Default
            </Button>
          </div>
          {hasUnsavedChanges && (
            <p className="text-center text-muted-foreground text-sm">
              You have unsaved changes
            </p>
          )}

          {/* Back Link */}
          <div className="text-center">
            <Link
              className="text-purple-600 text-sm hover:text-purple-700"
              href="/"
              onClick={(e) => {
                if (hasUnsavedChanges) {
                  e.preventDefault();
                  if (
                    confirm(
                      "You have unsaved changes. Are you sure you want to leave?"
                    )
                  ) {
                    router.push("/");
                  }
                }
              }}
            >
              ← Back to Game
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
