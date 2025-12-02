import {
  app,
  BrowserWindow,
  shell,
  Menu,
  Tray,
  nativeImage,
  globalShortcut,
  nativeTheme,
  ipcMain,
  dialog,
  Notification,
  powerMonitor,
} from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";

// ESM compatibility - __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (process.platform === "win32") {
  import("electron-squirrel-startup")
    .then((module) => {
      if (module.default) {
        app.quit();
      }
    })
    .catch(() => {
      // Package not installed, ignore
    });
}

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
  scheduledTime: number; // Unix timestamp
  recurring?: "daily" | "weekly" | false;
}

interface UserStats {
  streak: number;
  level: number;
  points: number;
  completedToday: boolean;
  lastPlayed?: string;
}

interface StoreSchema {
  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    reminderTime: string;
    achievements: boolean;
    streakWarnings: boolean;
  };
  autoLaunch: boolean;
  userStats: UserStats;
  scheduledNotifications: Record<string, ScheduledNotification>;
  badgeCount: number;
}

// Persistent storage
const store = new Store<StoreSchema>({
  defaults: {
    notifications: {
      enabled: true,
      dailyReminder: true,
      reminderTime: "09:00",
      achievements: true,
      streakWarnings: true,
    },
    autoLaunch: false,
    userStats: {
      streak: 0,
      level: 1,
      points: 0,
      completedToday: false,
    },
    scheduledNotifications: {},
    badgeCount: 0,
  },
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let dailyReminderTimeout: NodeJS.Timeout | null = null;
let streakCheckInterval: NodeJS.Timeout | null = null;

// Configuration
const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;
const DEV_URLS = ["http://localhost:3000", "http://localhost:3001"];
const PROD_URL = "https://rebuzzle.byronwade.com";
let WEB_URL = isDev ? DEV_URLS[0] : PROD_URL;

// Deep link protocol
const PROTOCOL = "rebuzzle";

// Check if a URL is reachable
async function findAvailableDevServer(): Promise<string> {
  if (!isDev) return PROD_URL;

  for (const url of DEV_URLS) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        console.log(`Found dev server at ${url}`);
        return url;
      }
    } catch {
      // Server not available, try next
    }
  }

  console.log("No dev server found, using production URL");
  return PROD_URL;
}

// ============================================
// NOTIFICATIONS SYSTEM
// ============================================

function showNativeNotification(payload: DesktopNotification): void {
  if (!Notification.isSupported()) {
    console.warn("Notifications not supported on this system");
    return;
  }

  const settings = store.get("notifications");
  if (!settings.enabled) return;

  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    silent: payload.silent ?? false,
    urgency: payload.urgency ?? "normal",
    timeoutType: payload.urgency === "critical" ? "never" : "default",
  });

  notification.on("click", () => {
    mainWindow?.show();
    mainWindow?.focus();
    if (payload.onClick) {
      handleDeepLink(`${PROTOCOL}://${payload.onClick}`);
    }
  });

  notification.show();
}

function scheduleNotification(payload: ScheduledNotification): string {
  const id = payload.id || `notif-${Date.now()}`;
  const scheduled = store.get("scheduledNotifications");
  scheduled[id] = { ...payload, id };
  store.set("scheduledNotifications", scheduled);

  checkScheduledNotifications();
  return id;
}

function cancelScheduledNotification(id: string): void {
  const scheduled = store.get("scheduledNotifications");
  delete scheduled[id];
  store.set("scheduledNotifications", scheduled);
}

function checkScheduledNotifications(): void {
  const now = Date.now();
  const scheduled = store.get("scheduledNotifications");

  for (const [id, notif] of Object.entries(scheduled)) {
    if (notif.scheduledTime <= now) {
      showNativeNotification(notif);

      if (notif.recurring === "daily") {
        // Reschedule for tomorrow
        notif.scheduledTime = now + 24 * 60 * 60 * 1000;
        scheduled[id] = notif;
      } else {
        delete scheduled[id];
      }
    }
  }

  store.set("scheduledNotifications", scheduled);
}

// Daily puzzle reminder
function setupDailyReminder(): void {
  if (dailyReminderTimeout) {
    clearTimeout(dailyReminderTimeout);
  }

  const settings = store.get("notifications");
  if (!settings.dailyReminder) return;

  const [hours, minutes] = settings.reminderTime.split(":").map(Number);
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const delay = reminderTime.getTime() - now.getTime();

  dailyReminderTimeout = setTimeout(() => {
    const stats = store.get("userStats");
    if (!stats.completedToday) {
      showNativeNotification({
        id: "daily-puzzle",
        title: "🧩 Daily Puzzle Ready!",
        body: "Today's Rebuzzle puzzle is waiting for you. Keep your streak alive!",
        onClick: "puzzle/today",
        urgency: "normal",
      });
    }
    // Reschedule for tomorrow
    setupDailyReminder();
  }, delay);

  console.log(`Daily reminder scheduled for ${reminderTime.toLocaleString()}`);
}

// Streak warning checker
function setupStreakWarning(): void {
  if (streakCheckInterval) {
    clearInterval(streakCheckInterval);
  }

  const settings = store.get("notifications");
  if (!settings.streakWarnings) return;

  // Check every hour
  streakCheckInterval = setInterval(() => {
    const stats = store.get("userStats");
    const now = new Date();

    // Warn at 8 PM if puzzle not completed
    if (now.getHours() === 20 && !stats.completedToday && stats.streak > 0) {
      showNativeNotification({
        id: "streak-warning",
        title: "⚠️ Streak at Risk!",
        body: `Your ${stats.streak}-day streak is at risk! Complete today's puzzle before midnight.`,
        onClick: "puzzle/today",
        urgency: "critical",
      });
    }
  }, 60 * 60 * 1000); // Check every hour
}

// Achievement notification
function showAchievementNotification(achievement: { name: string; description: string }): void {
  const settings = store.get("notifications");
  if (!settings.achievements) return;

  showNativeNotification({
    id: `achievement-${Date.now()}`,
    title: "🏆 Achievement Unlocked!",
    body: `${achievement.name}: ${achievement.description}`,
    onClick: "achievements",
    urgency: "low",
  });

  // Update badge
  incrementBadge();
}

// ============================================
// BADGE SYSTEM
// ============================================

function setBadgeCount(count: number): void {
  store.set("badgeCount", count);

  if (process.platform === "darwin") {
    app.dock?.setBadge(count > 0 ? String(count) : "");
  } else if (process.platform === "win32" && mainWindow) {
    if (count > 0) {
      // Create a badge overlay for Windows
      const canvas = Buffer.from(
        `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="8" fill="#ef4444"/>
          <text x="8" y="12" text-anchor="middle" fill="white" font-size="10" font-family="Arial">${count > 9 ? "9+" : count}</text>
        </svg>`
      );
      const icon = nativeImage.createFromBuffer(canvas);
      mainWindow.setOverlayIcon(icon, `${count} notifications`);
    } else {
      mainWindow.setOverlayIcon(null, "");
    }
  }
}

function incrementBadge(): void {
  const current = store.get("badgeCount");
  setBadgeCount(current + 1);
}

function clearBadge(): void {
  setBadgeCount(0);
}

// ============================================
// AUTO-LAUNCH
// ============================================

function setAutoLaunch(enabled: boolean): void {
  store.set("autoLaunch", enabled);

  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    args: ["--hidden"],
  });
}

function getAutoLaunch(): boolean {
  return store.get("autoLaunch");
}

// ============================================
// DEEP LINKING
// ============================================

function handleDeepLink(url: string): void {
  console.log("Handling deep link:", url);

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL}:`) return;

    const path = parsed.hostname + parsed.pathname;

    const routes: Record<string, string> = {
      "puzzle/today": "/",
      "puzzle": "/",
      "leaderboard": "/leaderboard",
      "achievements": "/profile#achievements",
      "profile": "/profile",
      "settings": "/settings",
      "blog": "/blog",
    };

    const webPath = routes[path] || "/";

    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.webContents.send("navigate", webPath);
  } catch (error) {
    console.error("Failed to parse deep link:", error);
  }
}

function setupDeepLinking(): void {
  // Register protocol
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // Handle protocol on macOS
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Handle protocol on Windows/Linux (single instance)
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", (_event, commandLine) => {
      // Find the deep link in command line args
      const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
      if (url) {
        handleDeepLink(url);
      }

      // Focus the window
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
}

// ============================================
// POWER MONITOR
// ============================================

function setupPowerMonitor(): void {
  powerMonitor.on("suspend", () => {
    console.log("System suspended");
    mainWindow?.webContents.send("power:suspend");
  });

  powerMonitor.on("resume", () => {
    console.log("System resumed");
    mainWindow?.webContents.send("power:resume");

    // Check for missed notifications
    checkScheduledNotifications();
  });

  powerMonitor.on("lock-screen", () => {
    console.log("Screen locked");
    mainWindow?.webContents.send("power:lock");
  });

  powerMonitor.on("unlock-screen", () => {
    console.log("Screen unlocked");
    mainWindow?.webContents.send("power:unlock");
  });

  // Check if on battery
  powerMonitor.on("on-battery", () => {
    mainWindow?.webContents.send("power:on-battery");
  });

  powerMonitor.on("on-ac", () => {
    mainWindow?.webContents.send("power:on-ac");
  });
}

// ============================================
// MENU
// ============================================

function createMenu(): void {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Preferences...",
                accelerator: "CmdOrCtrl+,",
                click: () => mainWindow?.webContents.send("navigate", "/settings"),
              },
              { type: "separator" as const },
              {
                label: "Check for Updates...",
                click: () => {
                  dialog.showMessageBox({
                    type: "info",
                    title: "Updates",
                    message: "You're running the latest version!",
                    detail: `Version ${app.getVersion()}`,
                  });
                },
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: "File",
      submenu: [
        {
          label: "New Game",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("navigate", "/"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },

    // Edit Menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },

    // View Menu
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { type: "separator" },
        {
          label: "Toggle Dark Mode",
          accelerator: "CmdOrCtrl+Shift+D",
          click: () => {
            nativeTheme.themeSource =
              nativeTheme.themeSource === "dark" ? "light" : "dark";
            mainWindow?.webContents.send("theme-changed", nativeTheme.shouldUseDarkColors);
          },
        },
      ],
    },

    // Game Menu
    {
      label: "Game",
      submenu: [
        {
          label: "Today's Puzzle",
          accelerator: "CmdOrCtrl+T",
          click: () => mainWindow?.webContents.send("navigate", "/"),
        },
        {
          label: "Leaderboard",
          accelerator: "CmdOrCtrl+L",
          click: () => mainWindow?.webContents.send("navigate", "/leaderboard"),
        },
        {
          label: "Profile",
          accelerator: "CmdOrCtrl+P",
          click: () => mainWindow?.webContents.send("navigate", "/profile"),
        },
        { type: "separator" },
        {
          label: "How to Play",
          accelerator: "CmdOrCtrl+H",
          click: () => mainWindow?.webContents.send("navigate", "/how-it-works"),
        },
      ],
    },

    // Notifications Menu
    {
      label: "Notifications",
      submenu: [
        {
          label: "Enable Notifications",
          type: "checkbox",
          checked: store.get("notifications.enabled"),
          click: (item) => {
            store.set("notifications.enabled", item.checked);
          },
        },
        {
          label: "Daily Reminder",
          type: "checkbox",
          checked: store.get("notifications.dailyReminder"),
          click: (item) => {
            store.set("notifications.dailyReminder", item.checked);
            setupDailyReminder();
          },
        },
        {
          label: "Achievement Alerts",
          type: "checkbox",
          checked: store.get("notifications.achievements"),
          click: (item) => {
            store.set("notifications.achievements", item.checked);
          },
        },
        {
          label: "Streak Warnings",
          type: "checkbox",
          checked: store.get("notifications.streakWarnings"),
          click: (item) => {
            store.set("notifications.streakWarnings", item.checked);
            setupStreakWarning();
          },
        },
        { type: "separator" },
        {
          label: "Clear All Notifications",
          click: () => clearBadge(),
        },
      ],
    },

    // Window Menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
              { type: "separator" as const },
              { role: "window" as const },
            ]
          : [{ role: "close" as const }]),
      ],
    },

    // Help Menu
    {
      label: "Help",
      submenu: [
        {
          label: "Learn More",
          click: () => shell.openExternal("https://rebuzzle.byronwade.com"),
        },
        {
          label: "Report a Bug",
          click: () =>
            shell.openExternal("https://github.com/byronwade/rebuzzle/issues"),
        },
        { type: "separator" },
        {
          label: "About Rebuzzle",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "About Rebuzzle",
              message: "Rebuzzle",
              detail: `Version ${app.getVersion()}\n\nA daily puzzle game that challenges your mind.\n\n© 2024 Rebuzzle Team`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================
// TRAY
// ============================================

function createTray(): void {
  // Create a simple tray icon
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip("Rebuzzle - Daily Puzzle");

  updateTrayMenu();

  tray.on("click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function updateTrayMenu(): void {
  if (!tray) return;

  const stats = store.get("userStats");
  const settings = store.get("notifications");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `🔥 Streak: ${stats.streak} days`,
      enabled: false,
    },
    {
      label: `⭐ Level ${stats.level} - ${stats.points} pts`,
      enabled: false,
    },
    {
      label: stats.completedToday ? "✅ Today's puzzle completed!" : "⏳ Puzzle waiting...",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Open Rebuzzle",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: "Today's Puzzle",
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send("navigate", "/");
      },
    },
    { type: "separator" },
    {
      label: "Leaderboard",
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send("navigate", "/leaderboard");
      },
    },
    {
      label: "Profile",
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send("navigate", "/profile");
      },
    },
    { type: "separator" },
    {
      label: "Notifications",
      type: "checkbox",
      checked: settings.enabled,
      click: (item) => {
        store.set("notifications.enabled", item.checked);
      },
    },
    {
      label: "Start at Login",
      type: "checkbox",
      checked: getAutoLaunch(),
      click: (item) => {
        setAutoLaunch(item.checked);
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ============================================
// GLOBAL SHORTCUTS
// ============================================

function registerShortcuts(): void {
  // Quick access to today's puzzle
  globalShortcut.register("CmdOrCtrl+Shift+R", () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.webContents.send("navigate", "/");
  });

  // Quick access to leaderboard
  globalShortcut.register("CmdOrCtrl+Shift+L", () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.webContents.send("navigate", "/leaderboard");
  });
}

// ============================================
// MAIN WINDOW
// ============================================

async function createWindow(): Promise<void> {
  // Find available dev server
  WEB_URL = await findAvailableDevServer();

  const windowConfig: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 900,
    minWidth: 420,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
    },
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    // Platform-specific styling
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hiddenInset",
          trafficLightPosition: { x: 15, y: 15 },
          vibrancy: "under-window",
          visualEffectState: "active",
        }
      : {
          frame: true,
          autoHideMenuBar: false,
        }),
  };

  mainWindow = new BrowserWindow(windowConfig);

  // Show window with fade-in effect
  mainWindow.once("ready-to-show", () => {
    // Check if started with --hidden flag
    if (!process.argv.includes("--hidden")) {
      mainWindow?.show();
    }

    // Focus the window
    if (process.platform === "darwin") {
      app.dock?.show();
    }
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation within the app
    if (url.startsWith(WEB_URL) || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    // Open external links in browser
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Handle navigation within the webContents
  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Allow navigation to our web app
    if (url.startsWith(WEB_URL) || url.startsWith("http://localhost")) {
      return;
    }
    // Prevent navigation to external sites, open in browser instead
    event.preventDefault();
    shell.openExternal(url);
  });

  // Inject desktop-specific styles and scripts after page loads
  mainWindow.webContents.on("did-finish-load", () => {
    // Add desktop-specific class to body
    mainWindow?.webContents.executeJavaScript(`
      document.body.classList.add('electron-app');
      document.body.dataset.platform = '${process.platform}';

      // Add custom CSS for native feel
      const style = document.createElement('style');
      style.textContent = \`
        /* Desktop-specific adjustments */
        .electron-app {
          /* Prevent text selection on UI elements */
          user-select: none;
        }

        .electron-app input,
        .electron-app textarea,
        .electron-app [contenteditable] {
          user-select: text;
        }

        /* macOS traffic light spacing */
        .electron-app[data-platform="darwin"] header {
          padding-left: 80px;
        }

        /* Smooth scrolling */
        .electron-app {
          scroll-behavior: smooth;
        }

        /* Hide scrollbar but keep functionality (macOS style) */
        .electron-app::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .electron-app::-webkit-scrollbar-track {
          background: transparent;
        }

        .electron-app::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
          border-radius: 4px;
        }

        .electron-app::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }

        /* Focus ring for keyboard navigation */
        .electron-app *:focus-visible {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }
      \`;
      document.head.appendChild(style);

      // Listen for navigation events from main process
      if (window.electronAPI) {
        window.electronAPI.receive('navigate', (path) => {
          window.location.href = path;
        });

        window.electronAPI.receive('theme-changed', (isDark) => {
          document.documentElement.classList.toggle('dark', isDark);
        });

        window.electronAPI.receive('power:suspend', () => {
          window.dispatchEvent(new CustomEvent('electron:suspend'));
        });

        window.electronAPI.receive('power:resume', () => {
          window.dispatchEvent(new CustomEvent('electron:resume'));
        });
      }
    `);
  });

  // Load the web app
  mainWindow.loadURL(WEB_URL);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // Handle window close
  mainWindow.on("close", (event) => {
    // On macOS, hide instead of quit (standard behavior)
    if (process.platform === "darwin") {
      event.preventDefault();
      mainWindow?.hide();
      app.dock?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ============================================
// IPC HANDLERS
// ============================================

function setupIPC(): void {
  // Handle navigation requests from renderer
  ipcMain.handle("navigate", (_event, path: string) => {
    mainWindow?.webContents.send("navigate", path);
  });

  // Handle theme toggle
  ipcMain.handle("toggle-theme", () => {
    nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? "light" : "dark";
    return nativeTheme.shouldUseDarkColors;
  });

  // ============================================
  // NOTIFICATION IPC
  // ============================================

  ipcMain.handle("notification:show", (_event, payload: DesktopNotification) => {
    showNativeNotification(payload);
  });

  ipcMain.handle("notification:schedule", (_event, payload: ScheduledNotification) => {
    return scheduleNotification(payload);
  });

  ipcMain.handle("notification:cancel", (_event, id: string) => {
    cancelScheduledNotification(id);
  });

  ipcMain.handle("notification:request-permission", () => {
    return Notification.isSupported();
  });

  // ============================================
  // BADGE IPC
  // ============================================

  ipcMain.handle("badge:set", (_event, count: number) => {
    setBadgeCount(count);
  });

  ipcMain.handle("badge:clear", () => {
    clearBadge();
  });

  ipcMain.handle("badge:increment", () => {
    incrementBadge();
  });

  // ============================================
  // SETTINGS IPC
  // ============================================

  ipcMain.handle("settings:get", (_event, key: string) => {
    return store.get(key as keyof StoreSchema);
  });

  ipcMain.handle("settings:set", (_event, key: string, value: unknown) => {
    store.set(key as keyof StoreSchema, value as never);

    // Handle side effects
    if (key === "notifications.dailyReminder" || key === "notifications.reminderTime") {
      setupDailyReminder();
    }
    if (key === "notifications.streakWarnings") {
      setupStreakWarning();
    }
  });

  ipcMain.handle("settings:get-auto-launch", () => {
    return getAutoLaunch();
  });

  ipcMain.handle("settings:set-auto-launch", (_event, enabled: boolean) => {
    setAutoLaunch(enabled);
  });

  // ============================================
  // USER STATS IPC
  // ============================================

  ipcMain.handle("stats:update", (_event, stats: Partial<UserStats>) => {
    const current = store.get("userStats");
    const updated = { ...current, ...stats };
    store.set("userStats", updated);
    updateTrayMenu();

    // Check for achievement trigger
    if (stats.completedToday && !current.completedToday) {
      // Daily puzzle completed
      if (updated.streak > 0 && updated.streak % 7 === 0) {
        showAchievementNotification({
          name: `${updated.streak}-Day Streak!`,
          description: `You've maintained a ${updated.streak}-day puzzle streak!`,
        });
      }
    }
  });

  ipcMain.handle("stats:get", () => {
    return store.get("userStats");
  });

  // ============================================
  // POWER IPC
  // ============================================

  ipcMain.handle("power:get-idle-time", () => {
    return powerMonitor.getSystemIdleTime();
  });

  ipcMain.handle("power:get-idle-state", (_event, threshold: number) => {
    return powerMonitor.getSystemIdleState(threshold);
  });

  // ============================================
  // CLIPBOARD IPC
  // ============================================

  ipcMain.handle("clipboard:write-text", async (_event, text: string) => {
    const { clipboard } = await import("electron");
    clipboard.writeText(text);
  });

  ipcMain.handle("clipboard:read-text", async () => {
    const { clipboard } = await import("electron");
    return clipboard.readText();
  });

  // ============================================
  // APP INFO IPC
  // ============================================

  ipcMain.handle("get-app-info", () => ({
    version: app.getVersion(),
    platform: process.platform,
    isDev,
  }));

  // Legacy notification handler
  ipcMain.handle("show-notification", (_event, { title, body }: { title: string; body: string }) => {
    showNativeNotification({
      id: `legacy-${Date.now()}`,
      title,
      body,
    });
  });
}

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(() => {
  setupDeepLinking();
  createMenu();
  createWindow();
  createTray();
  registerShortcuts();
  setupIPC();
  setupPowerMonitor();
  setupDailyReminder();
  setupStreakWarning();

  // Check for scheduled notifications periodically
  setInterval(checkScheduledNotifications, 60 * 1000); // Every minute

  // macOS: Re-create window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
      app.dock?.show();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Clean up on quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();

  if (dailyReminderTimeout) {
    clearTimeout(dailyReminderTimeout);
  }
  if (streakCheckInterval) {
    clearInterval(streakCheckInterval);
  }
});

// Handle certificate errors (for development with localhost)
app.on("certificate-error", (event, _webContents, _url, _error, _certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Allow same-origin navigation
    if (url.startsWith(WEB_URL) || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    // Open external URLs in browser
    shell.openExternal(url);
    return { action: "deny" };
  });
});
