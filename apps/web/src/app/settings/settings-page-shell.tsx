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


import { SettingsPageShellLower } from "./settings-page-shell-lower";

export function SettingsPageShell(props: Record<string, any>) {
  const {
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
  } = props;
    return (
    <>

    <Layout>      <SettingsPageShellLower {...props} />
    </>
  );
}
