"use client";

import { SettingsPageShell } from "./settings-page-shell";
import { useSettingsPage } from "./use-settings-page";

export default function SettingsPage(props: any) {
  const state = useSettingsPage(props);
  return <SettingsPageShell {...state} />;
}
