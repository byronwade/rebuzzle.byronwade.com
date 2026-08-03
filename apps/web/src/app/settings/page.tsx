import SettingsPageClient from "./settings-client";

/**
 * Settings is fully interactive (theme, notifications, profile form) and loads
 * avatar preferences with credentials after AuthProvider hydrates — keep on client.
 */
export default function SettingsPage() {
  return <SettingsPageClient />;
}
