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
import { useIsClient } from "@/lib/hooks/use-is-client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { cn } from "@/lib/utils";
import { VISUAL_THEME_META, VISUAL_THEMES, type VisualTheme } from "@/lib/visual-theme";
import { fail } from "@/lib/fail";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { visualTheme, setVisualTheme, mounted: themeMounted } = useVisualTheme();
  const { user, isAuthenticated } = useAuth();
  const mounted = useIsClient();
  const [devMode, setDevMode] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => createDefaultAppSettings(false));
  const [savedSettings, setSavedSettings] = useState<AppSettings>(() =>
    createDefaultAppSettings(false)
  );
  const [hydrated, setHydrated] = useState(false);
  const [prevTheme, setPrevTheme] = useState(theme);

  // Hydrate from localStorage once after mount (no effect-driven setState)
  if (mounted && !hydrated) {
    const initial = readAppSettings(
      localStorage,
      createDefaultAppSettings(theme === "dark")
    );
    setSettings(initial);
    setSavedSettings(initial);
    setDevMode(isDevModeEnabled());
    setHydrated(true);
  }

  // Sync darkMode when next-themes resolves/changes
  if (theme !== prevTheme) {
    setPrevTheme(theme);
    if (theme === "dark" || theme === "light") {
      setSettings((prev) => ({ ...prev, darkMode: theme === "dark" }));
    }
  }

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

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

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-subtle" />
            <h1 className="font-semibold text-base md:text-lg">Settings</h1>
          </div>
          <p className="text-muted-foreground text-sm">Manage your preferences and game settings</p>
        </div>

        <div className="space-y-6">
          {/* Achievements & Levels Link */}
          <Link href="/achievements">
            <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7928ca] to-[#ff0080]">
                    <Trophy className="size-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">Achievements & Levels</h2>
                    <p className="text-muted-foreground text-sm">
                      View all 100 achievements and level ranks
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Card>
          </Link>

          {/* Email Notifications Form */}
          <EmailNotificationForm />

          {/* Temporary Dev Mode */}
          <Card className="border-amber-500/40 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
              <FlaskConical className="h-5 w-5 text-amber-600" />
              Dev Mode
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-[10px] text-amber-800 uppercase tracking-wide dark:text-amber-300">
                Temporary
              </span>
            </h2>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="cursor-pointer text-base" htmlFor="dev-mode">
                  Enable testing tools
                </Label>
                <p className="text-muted-foreground text-sm">
                  Shows a floating panel on every page: regenerate today&apos;s puzzle, open the
                  Visual Lab (pictogram / text / image / hybrid previews), unlock/replay the daily
                  gate, and jump between play → locked → win/lose screens. Works for guests and
                  signed-in accounts while this temporary tooling is enabled.
                </p>
              </div>
              <Switch
                checked={devMode}
                disabled={!mounted}
                id="dev-mode"
                onCheckedChange={(checked) => {
                  setDevMode(checked);
                  setDevModeEnabled(checked);
                  toast({
                    title: checked ? "Dev Mode on" : "Dev Mode off",
                    description: checked
                      ? "Look for the amber Dev Mode panel (bottom-right)."
                      : "Testing tools hidden.",
                  });
                }}
              />
            </div>
            {devMode && (
              <div className="mt-4 border-amber-500/20 border-t pt-4">
                <Link
                  className="inline-flex items-center gap-2 text-amber-800 text-sm underline-offset-2 hover:underline dark:text-amber-300"
                  href="/dev/visual-lab"
                >
                  <Palette className="h-4 w-4" />
                  Open Visual Lab — test pictogram / text / image generation
                </Link>
              </div>
            )}
          </Card>

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
                    Audio cues for guesses, hints, solve results, and key actions
                  </p>
                </div>
                <Switch
                  checked={settings.sound}
                  id="sound"
                  onCheckedChange={(checked) => {
                    setSettings((current) => ({ ...current, sound: checked }));
                    void playInterfaceSound(checked ? "sound-on" : "sound-off", {
                      ignorePreference: true,
                    });
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="cursor-pointer text-base" htmlFor="show-hints">
                    Show Hints
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Display hint button during gameplay
                  </p>
                </div>
                <Switch
                  checked={settings.showHints}
                  id="show-hints"
                  onCheckedChange={(checked) => setSettings({ ...settings, showHints: checked })}
                />
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
              <Palette className="h-5 w-5" />
              Appearance
            </h2>

            <div className="space-y-6">
              <div className="space-y-3">
                <div>
                  <Label className="text-base">Theme</Label>
                  <p className="text-muted-foreground text-sm">
                    Visual style for the whole app. Default is the current Rebuzzle look; 8-bit is
                    inspired by{" "}
                    <a
                      className="text-link underline-offset-2 hover:underline"
                      href="https://www.8bitcn.com/docs"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      8bitcn/ui
                    </a>
                    .
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {VISUAL_THEMES.map((id) => {
                    const meta = VISUAL_THEME_META[id];
                    const selected = themeMounted && visualTheme === id;
                    const Icon = id === "8bit" ? Gamepad2 : Palette;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!themeMounted}
                        onClick={() => {
                          setVisualTheme(id as VisualTheme);
                          toast({
                            title: `${meta.label} theme`,
                            description: meta.description,
                          });
                        }}
                        className={cn(
                          "relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "border-foreground bg-muted/40" : "border-border bg-card"
                        )}
                      >
                        <div className="flex w-full items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="font-medium text-sm">{meta.label}</span>
                          {selected && <Check data-icon="inline-end" className="ml-auto h-4 w-4" />}
                        </div>
                        <p className="text-muted-foreground text-xs leading-snug">
                          {meta.description}
                        </p>
                        {id === "8bit" && (
                          <span
                            className="mt-1 font-normal text-[10px] uppercase tracking-wide text-subtle"
                            style={{ fontFamily: "var(--font-pixel), monospace" }}
                          >
                            PRESS START
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="cursor-pointer text-base" htmlFor="dark-mode">
                    Dark Mode
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Works with every theme (Default and 8-bit)
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
                    autoComplete="current-password"
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
                    <p className="mt-1.5 text-destructive text-xs" role="alert">
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm" htmlFor="new-password">
                    New Password
                  </Label>
                  <Input
                    autoComplete="new-password"
                    className="mt-1"
                    id="new-password"
                    minLength={6}
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
                    <p className="mt-1.5 text-destructive text-xs" role="alert">
                      {passwordErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm" htmlFor="confirm-password">
                    Confirm New Password
                  </Label>
                  <Input
                    autoComplete="new-password"
                    className="mt-1"
                    id="confirm-password"
                    minLength={6}
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
                    <p className="mt-1.5 text-destructive text-xs" role="alert">
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
                <p className="mb-4 text-muted-foreground text-sm">
                  Your game statistics are stored locally on your device. We don't sell or share
                  your data.
                </p>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleClearData}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" data-icon="inline-start" />
                  Clear All Game Data
                </Button>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              aria-label="Save settings"
              className="flex-1"
              disabled={!hasUnsavedChanges}
              onClick={handleSave}
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" data-icon="inline-start" />
              {hasUnsavedChanges ? "Save Settings" : "Saved"}
            </Button>
            <Button onClick={handleReset} size="lg" variant="outline">
              Reset to Default
            </Button>
          </div>
          {hasUnsavedChanges && (
            <p className="text-center text-muted-foreground text-sm">You have unsaved changes</p>
          )}

          {/* Back Link */}
          <div className="text-center">
            <Link
              className="text-muted-foreground text-sm hover:text-foreground"
              href="/"
              onClick={(e) => {
                if (hasUnsavedChanges) {
                  e.preventDefault();
                  if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
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
