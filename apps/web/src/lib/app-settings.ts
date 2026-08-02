export const APP_SETTINGS_STORAGE_KEY = "appSettings";

export interface AppSettings {
  notifications: boolean;
  sound: boolean;
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  showHints: boolean;
}

export function createDefaultAppSettings(darkMode = false): AppSettings {
  return {
    notifications: false,
    sound: true,
    darkMode,
    emailNotifications: false,
    pushNotifications: false,
    showHints: true,
  };
}

export function normalizeAppSettings(
  value: unknown,
  defaults = createDefaultAppSettings()
): AppSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const candidate = value as Record<string, unknown>;
  return {
    notifications:
      typeof candidate.notifications === "boolean"
        ? candidate.notifications
        : defaults.notifications,
    sound: typeof candidate.sound === "boolean" ? candidate.sound : defaults.sound,
    darkMode: typeof candidate.darkMode === "boolean" ? candidate.darkMode : defaults.darkMode,
    emailNotifications:
      typeof candidate.emailNotifications === "boolean"
        ? candidate.emailNotifications
        : defaults.emailNotifications,
    pushNotifications:
      typeof candidate.pushNotifications === "boolean"
        ? candidate.pushNotifications
        : defaults.pushNotifications,
    showHints: typeof candidate.showHints === "boolean" ? candidate.showHints : defaults.showHints,
  };
}

export function readAppSettings(
  storage: Pick<Storage, "getItem"> | undefined = typeof window === "undefined"
    ? undefined
    : window.localStorage,
  defaults = createDefaultAppSettings()
): AppSettings {
  if (!storage) return defaults;

  try {
    const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
    return raw ? normalizeAppSettings(JSON.parse(raw), defaults) : defaults;
  } catch {
    return defaults;
  }
}

export function writeAppSettings(
  settings: AppSettings,
  storage: Pick<Storage, "setItem"> = window.localStorage
): void {
  storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
