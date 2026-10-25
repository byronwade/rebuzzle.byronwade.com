"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import {
  Check,
  ChevronRight,
  FlaskConical,
  Loader2,
  Monitor,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { EmailNotificationForm } from "@/components/EmailNotificationForm";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { fail } from "@/lib/fail";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { cn } from "@/lib/utils";
import { VISUAL_THEME_META, VISUAL_THEMES, type VisualTheme } from "@/lib/visual-theme";

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  // The provider hydrates in the root layout before this streamed page, so its
  // `mounted` is already true mid-hydration here; use this page's own flag.
  const { visualTheme, setVisualTheme } = useVisualTheme();
  const { user, isAuthenticated } = useAuth();
  const mounted = useIsClient();
  const [devMode, setDevMode] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => createDefaultAppSettings(false));
  const [hydrated, setHydrated] = useState(false);
  const [prevTheme, setPrevTheme] = useState(theme);

  // Hydrate from localStorage once after mount (no effect-driven setState)
  if (mounted && !hydrated) {
    const initial = readAppSettings(localStorage, createDefaultAppSettings(theme === "dark"));
    setSettings(initial);
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

  // Every control saves the moment it changes; there is no separate save step.
  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writeAppSettings(next);
      return next;
    });
  };

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

  const handleReset = () => {
    if (confirm("Reset every setting to its default?")) {
      const defaultSettings = createDefaultAppSettings();
      setSettings(defaultSettings);
      writeAppSettings(defaultSettings);
      void playInterfaceSound("sound-on", { ignorePreference: true });
      toast({
        title: "Settings reset",
        description: "Everything is back to the defaults.",
      });
    }
  };

  const handleClearData = () => {
    if (confirm("Delete all game data on this device? This can’t be undone.")) {
      localStorage.removeItem("userStats");
      localStorage.removeItem("gameCompletion");
      localStorage.removeItem("appSettings");
      toast({
        title: "Data cleared",
        description: "All game data on this device was deleted.",
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
        title: "Log in required",
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
        title: "Password changed",
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

  const colorMode = mounted ? (theme ?? "system") : "system";

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <PageHeader
          description="Changes save as you make them and stay on this device."
          eyebrow="Preferences"
          title="Settings."
        />

        <div className="space-y-10">
          <SettingsSection title="Gameplay">
            <SettingsRow
              control={
                <Switch
                  checked={settings.sound}
                  id="sound"
                  onCheckedChange={(checked) => {
                    updateSettings({ sound: checked });
                    void playInterfaceSound(checked ? "sound-on" : "sound-off", {
                      ignorePreference: true,
                    });
                  }}
                />
              }
              description="Audio cues for guesses, hints, results and key actions."
              htmlFor="sound"
              label="Sound effects"
            />
            <SettingsRow
              control={
                <Switch
                  checked={settings.showHints}
                  id="show-hints"
                  onCheckedChange={(checked) => updateSettings({ showHints: checked })}
                />
              }
              description="Show the hint button while you play."
              htmlFor="show-hints"
              label="Hints"
            />
          </SettingsSection>

          <SettingsSection title="Appearance">
            <div className="space-y-3 p-4 sm:p-5">
              <div>
                <p className="font-medium text-foreground text-sm">Color mode</p>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  System follows your device. Works with every style.
                </p>
              </div>
              <RadioGroupPrimitive.Root
                aria-label="Color mode"
                className="touch-targets inline-grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-inset p-1 sm:w-auto"
                disabled={!mounted}
                onValueChange={(value) => {
                  setTheme(value);
                  if (value !== "system") updateSettings({ darkMode: value === "dark" });
                }}
                orientation="horizontal"
                value={colorMode}
              >
                {COLOR_MODES.map(({ value, label, icon: Icon }) => {
                  const selected = colorMode === value;
                  return (
                    <RadioGroupPrimitive.Item
                      className={cn(
                        "inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-3 font-medium sm:h-9 text-sm transition-colors focus-ring",
                        selected
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      key={value}
                      value={value}
                    >
                      <Icon aria-hidden className="h-4 w-4" />
                      {label}
                    </RadioGroupPrimitive.Item>
                  );
                })}
              </RadioGroupPrimitive.Root>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <div>
                <p className="font-medium text-foreground text-sm">Style</p>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  The look of the whole app. 8-bit is inspired by{" "}
                  <a
                    className="text-link underline underline-offset-2"
                    href="https://www.8bitcn.com/docs"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    8bitcn/ui
                  </a>
                  .
                </p>
              </div>
              <RadioGroupPrimitive.Root
                aria-label="Style"
                className="grid gap-3 sm:grid-cols-2"
                disabled={!mounted}
                onValueChange={(value) => setVisualTheme(value as VisualTheme)}
                value={mounted ? visualTheme : undefined}
              >
                {VISUAL_THEMES.map((id) => {
                  const meta = VISUAL_THEME_META[id];
                  const selected = mounted && visualTheme === id;
                  const isPixel = id === "8bit";
                  return (
                    <RadioGroupPrimitive.Item
                      className={cn(
                        "group relative overflow-hidden rounded-lg border text-left transition-colors focus-ring",
                        selected
                          ? "border-foreground ring-1 ring-foreground"
                          : "border-border hover:border-border-strong"
                      )}
                      key={id}
                      value={id}
                    >
                      {/* Miniature of the style: a puzzle tile and a commit button */}
                      <div
                        aria-hidden
                        className={cn(
                          "flex h-24 items-center justify-center gap-3 border-border border-b bg-inset",
                          isPixel &&
                            "[background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:8px_8px]"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-12 items-center bg-card px-3 font-semibold text-foreground text-sm",
                            isPixel
                              ? "border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                              : "rounded-lg border border-border shadow-sm"
                          )}
                          style={
                            isPixel ? { fontFamily: "var(--font-pixel), monospace" } : undefined
                          }
                        >
                          {isPixel ? "REBUS" : "Rebus"}
                        </span>
                        <span
                          className={cn(
                            "h-8 w-8 bg-foreground",
                            isPixel ? "shadow-[3px_3px_0_hsl(var(--brand))]" : "rounded-full"
                          )}
                        />
                      </div>
                      <div className="flex items-start gap-2 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm">{meta.label}</p>
                          <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
                            {meta.description}
                          </p>
                        </div>
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border-strong"
                          )}
                        >
                          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                      </div>
                    </RadioGroupPrimitive.Item>
                  );
                })}
              </RadioGroupPrimitive.Root>
            </div>
          </SettingsSection>

          <SettingsSection description="A nudge when the new puzzle drops." title="Daily reminder">
            <div className="p-4 sm:p-5">
              <EmailNotificationForm />
            </div>
          </SettingsSection>

          {isAuthenticated && user && (
            <SettingsSection title="Password">
              <form
                className="space-y-4 p-4 sm:p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handlePasswordChange();
                }}
              >
                {(
                  [
                    ["currentPassword", "current-password", "Current password", "current-password"],
                    ["newPassword", "new-password", "New password", "new-password"],
                    ["confirmPassword", "confirm-password", "Confirm new password", "new-password"],
                  ] as const
                ).map(([field, id, label, autoComplete]) => (
                  <div key={field}>
                    <Label className="text-sm" htmlFor={id}>
                      {label}
                    </Label>
                    <Input
                      aria-invalid={Boolean(passwordErrors[field])}
                      autoComplete={autoComplete}
                      className="mt-1.5"
                      id={id}
                      minLength={field === "currentPassword" ? undefined : 6}
                      name={id}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, [field]: e.target.value })
                      }
                      type="password"
                      value={passwordForm[field]}
                    />
                    {passwordErrors[field] ? (
                      <p className="mt-1.5 text-destructive text-xs" role="alert">
                        {passwordErrors[field]}
                      </p>
                    ) : field === "newPassword" ? (
                      <p className="mt-1.5 text-muted-foreground text-xs">At least 6 characters.</p>
                    ) : null}
                  </div>
                ))}
                <Button disabled={isChangingPassword} type="submit">
                  {isChangingPassword ? (
                    <Loader2
                      aria-hidden
                      className="h-4 w-4 motion-safe:animate-spin"
                      data-icon="inline-start"
                    />
                  ) : null}
                  {isChangingPassword ? "Changing…" : "Change password"}
                </Button>
              </form>
            </SettingsSection>
          )}

          <SettingsSection
            description="Your stats live on this device. We don’t sell or share them."
            title="Data"
          >
            <SettingsRow
              control={
                <Button onClick={handleReset} size="sm" variant="outline">
                  <RotateCcw aria-hidden className="h-4 w-4" data-icon="inline-start" />
                  Reset
                </Button>
              }
              description="Put every preference back to its default."
              label="Reset settings"
            />
            <SettingsRow
              control={
                <Button onClick={handleClearData} size="sm" variant="destructive">
                  <Trash2 aria-hidden className="h-4 w-4" data-icon="inline-start" />
                  Clear…
                </Button>
              }
              description="Delete stats, streaks and saved games on this device."
              label="Clear game data"
            />
          </SettingsSection>

          <SettingsSection
            description="Temporary tools for testing puzzles. Hidden from players by default."
            title="Developer"
          >
            <SettingsRow
              control={
                <Switch
                  checked={devMode}
                  disabled={!mounted}
                  id="dev-mode"
                  onCheckedChange={(checked) => {
                    setDevMode(checked);
                    setDevModeEnabled(checked);
                    toast({
                      title: checked ? "Dev mode on" : "Dev mode off",
                      description: checked
                        ? "Look for the Dev Mode panel in the bottom-right corner."
                        : "Testing tools hidden.",
                    });
                  }}
                />
              }
              description="A floating panel to regenerate today’s puzzle, open the Visual Lab, unlock the daily gate and jump between game screens."
              htmlFor="dev-mode"
              label="Testing tools"
            />
            {devMode && (
              <Link
                className="flex items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-muted/60 sm:px-5"
                href="/dev/visual-lab"
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <FlaskConical aria-hidden className="h-4 w-4 text-subtle" />
                  Open the Visual Lab
                </span>
                <ChevronRight aria-hidden className="h-4 w-4 text-subtle" />
              </Link>
            )}
          </SettingsSection>
        </div>
      </div>
    </Layout>
  );
}

const COLOR_MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-semibold text-base text-foreground tracking-[-0.02em]">{title}</h2>
        {description ? <p className="mt-0.5 text-muted-foreground text-sm">{description}</p> : null}
      </div>
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </section>
  );
}

function SettingsRow({
  label,
  description,
  htmlFor,
  control,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 sm:px-5">
      <div className="min-w-0 space-y-0.5">
        {htmlFor ? (
          <Label className="cursor-pointer text-sm" htmlFor={htmlFor}>
            {label}
          </Label>
        ) : (
          <p className="font-medium text-foreground text-sm">{label}</p>
        )}
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
