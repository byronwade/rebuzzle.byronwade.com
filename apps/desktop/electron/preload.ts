import { contextBridge, ipcRenderer } from "electron";

// Type definitions
interface DesktopNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  actions?: Array<{ id: string; title: string }>;
  urgency?: "low" | "normal" | "critical";
  silent?: boolean;
  onClick?: string;
}

interface ScheduledNotification extends DesktopNotification {
  scheduledTime: number;
  recurring?: "daily" | "weekly" | false;
}

interface UserStats {
  streak: number;
  level: number;
  points: number;
  completedToday: boolean;
  lastPlayed?: string;
}

// Valid IPC channels for security
const validSendChannels = [
  "navigate",
  "toggle-theme",
  "show-notification",
  "get-app-info",
  "notification:show",
  "notification:schedule",
  "notification:cancel",
  "notification:request-permission",
  "badge:set",
  "badge:clear",
  "badge:increment",
  "settings:get",
  "settings:set",
  "settings:get-auto-launch",
  "settings:set-auto-launch",
  "stats:update",
  "stats:get",
  "power:get-idle-time",
  "power:get-idle-state",
  "clipboard:write-text",
  "clipboard:read-text",
];

const validReceiveChannels = [
  "navigate",
  "theme-changed",
  "fromMain",
  "power:suspend",
  "power:resume",
  "power:lock",
  "power:unlock",
  "power:on-battery",
  "power:on-ac",
  "deep-link",
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // ============================================
  // PLATFORM INFO
  // ============================================
  platform: process.platform,
  isElectron: true,

  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // ============================================
  // NAVIGATION
  // ============================================
  navigate: (path: string) => ipcRenderer.invoke("navigate", path),

  // ============================================
  // THEME
  // ============================================
  toggleTheme: () => ipcRenderer.invoke("toggle-theme"),

  // ============================================
  // NOTIFICATIONS
  // ============================================
  notification: {
    show: (payload: DesktopNotification) =>
      ipcRenderer.invoke("notification:show", payload),

    schedule: (payload: ScheduledNotification): Promise<string> =>
      ipcRenderer.invoke("notification:schedule", payload),

    cancel: (id: string) => ipcRenderer.invoke("notification:cancel", id),

    requestPermission: (): Promise<boolean> =>
      ipcRenderer.invoke("notification:request-permission"),
  },

  // Legacy notification method (for backward compatibility)
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke("show-notification", { title, body }),

  // ============================================
  // BADGE
  // ============================================
  badge: {
    set: (count: number) => ipcRenderer.invoke("badge:set", count),
    clear: () => ipcRenderer.invoke("badge:clear"),
    increment: () => ipcRenderer.invoke("badge:increment"),
  },

  // ============================================
  // SETTINGS
  // ============================================
  settings: {
    get: <T>(key: string): Promise<T> => ipcRenderer.invoke("settings:get", key),

    set: (key: string, value: unknown) =>
      ipcRenderer.invoke("settings:set", key, value),

    getAutoLaunch: (): Promise<boolean> =>
      ipcRenderer.invoke("settings:get-auto-launch"),

    setAutoLaunch: (enabled: boolean) =>
      ipcRenderer.invoke("settings:set-auto-launch", enabled),
  },

  // ============================================
  // USER STATS
  // ============================================
  stats: {
    update: (stats: Partial<UserStats>) =>
      ipcRenderer.invoke("stats:update", stats),

    get: (): Promise<UserStats> => ipcRenderer.invoke("stats:get"),
  },

  // ============================================
  // POWER MONITOR
  // ============================================
  power: {
    getIdleTime: (): Promise<number> =>
      ipcRenderer.invoke("power:get-idle-time"),

    getIdleState: (threshold: number): Promise<"active" | "idle" | "locked" | "unknown"> =>
      ipcRenderer.invoke("power:get-idle-state", threshold),

    onSuspend: (callback: () => void): (() => void) => {
      const subscription = () => callback();
      ipcRenderer.on("power:suspend", subscription);
      return () => ipcRenderer.removeListener("power:suspend", subscription);
    },

    onResume: (callback: () => void): (() => void) => {
      const subscription = () => callback();
      ipcRenderer.on("power:resume", subscription);
      return () => ipcRenderer.removeListener("power:resume", subscription);
    },

    onLock: (callback: () => void): (() => void) => {
      const subscription = () => callback();
      ipcRenderer.on("power:lock", subscription);
      return () => ipcRenderer.removeListener("power:lock", subscription);
    },

    onUnlock: (callback: () => void): (() => void) => {
      const subscription = () => callback();
      ipcRenderer.on("power:unlock", subscription);
      return () => ipcRenderer.removeListener("power:unlock", subscription);
    },

    onBattery: (callback: () => void): (() => void) => {
      const subscription = () => callback();
      ipcRenderer.on("power:on-battery", subscription);
      return () => ipcRenderer.removeListener("power:on-battery", subscription);
    },

    onAC: (callback: () => void): (() => void) => {
      const subscription = () => callback();
      ipcRenderer.on("power:on-ac", subscription);
      return () => ipcRenderer.removeListener("power:on-ac", subscription);
    },
  },

  // ============================================
  // CLIPBOARD
  // ============================================
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke("clipboard:write-text", text),
    readText: (): Promise<string> => ipcRenderer.invoke("clipboard:read-text"),
  },

  // ============================================
  // DEEP LINKING
  // ============================================
  deepLink: {
    onOpen: (callback: (url: string) => void): (() => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, url: string) =>
        callback(url);
      ipcRenderer.on("deep-link", subscription);
      return () => ipcRenderer.removeListener("deep-link", subscription);
    },
  },

  // ============================================
  // APP INFO
  // ============================================
  getAppInfo: (): Promise<{
    version: string;
    platform: string;
    isDev: boolean;
  }> => ipcRenderer.invoke("get-app-info"),

  // ============================================
  // GENERIC IPC METHODS
  // ============================================
  send: (channel: string, data: unknown) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  invoke: (channel: string, ...args: unknown[]) => {
    if (validSendChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },

  receive: (channel: string, func: (...args: unknown[]) => void) => {
    if (validReceiveChannels.includes(channel)) {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    return () => {};
  },

  once: (channel: string, func: (...args: unknown[]) => void) => {
    if (validReceiveChannels.includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    }
  },
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      // Platform info
      platform: string;
      isElectron: boolean;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };

      // Navigation
      navigate: (path: string) => Promise<void>;

      // Theme
      toggleTheme: () => Promise<boolean>;

      // Notifications
      notification: {
        show: (payload: DesktopNotification) => Promise<void>;
        schedule: (payload: ScheduledNotification) => Promise<string>;
        cancel: (id: string) => Promise<void>;
        requestPermission: () => Promise<boolean>;
      };
      showNotification: (title: string, body: string) => Promise<void>;

      // Badge
      badge: {
        set: (count: number) => Promise<void>;
        clear: () => Promise<void>;
        increment: () => Promise<void>;
      };

      // Settings
      settings: {
        get: <T>(key: string) => Promise<T>;
        set: (key: string, value: unknown) => Promise<void>;
        getAutoLaunch: () => Promise<boolean>;
        setAutoLaunch: (enabled: boolean) => Promise<void>;
      };

      // User Stats
      stats: {
        update: (stats: Partial<UserStats>) => Promise<void>;
        get: () => Promise<UserStats>;
      };

      // Power Monitor
      power: {
        getIdleTime: () => Promise<number>;
        getIdleState: (threshold: number) => Promise<"active" | "idle" | "locked" | "unknown">;
        onSuspend: (callback: () => void) => () => void;
        onResume: (callback: () => void) => () => void;
        onLock: (callback: () => void) => () => void;
        onUnlock: (callback: () => void) => () => void;
        onBattery: (callback: () => void) => () => void;
        onAC: (callback: () => void) => () => void;
      };

      // Clipboard
      clipboard: {
        writeText: (text: string) => Promise<void>;
        readText: () => Promise<string>;
      };

      // Deep Linking
      deepLink: {
        onOpen: (callback: (url: string) => void) => () => void;
      };

      // App Info
      getAppInfo: () => Promise<{
        version: string;
        platform: string;
        isDev: boolean;
      }>;

      // Generic IPC
      send: (channel: string, data: unknown) => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      receive: (channel: string, func: (...args: unknown[]) => void) => () => void;
      once: (channel: string, func: (...args: unknown[]) => void) => void;
    };
  }
}
