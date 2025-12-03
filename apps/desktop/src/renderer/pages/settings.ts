/**
 * Settings Page
 * Desktop-specific settings and preferences
 */

import { appStore } from '../lib/store';

export async function createSettingsPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page settings-page';

  // Get current settings
  let autoLaunch = false;
  let theme: 'light' | 'dark' | 'system' = appStore.get('theme');

  if (window.electronAPI) {
    try {
      autoLaunch = await window.electronAPI.settings.getAutoLaunch();
    } catch {
      // Ignore
    }
  }

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
    </div>

    <div class="settings-section">
      <h2 class="section-title">Appearance</h2>
      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Theme</span>
            <span class="setting-description">Choose your preferred color theme</span>
          </div>
          <select class="theme-select" id="theme-select">
            <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="system" ${theme === 'system' ? 'selected' : ''}>System</option>
          </select>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title">General</h2>
      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Launch at startup</span>
            <span class="setting-description">Open Rebuzzle when you start your computer</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="auto-launch" ${autoLaunch ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title">Notifications</h2>
      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Daily reminder</span>
            <span class="setting-description">Get notified when a new puzzle is available</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="daily-reminder" checked>
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Streak warning</span>
            <span class="setting-description">Alert before your streak resets</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="streak-warning" checked>
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title">Keyboard Shortcuts</h2>
      <div class="shortcuts-list">
        <div class="shortcut-item">
          <span class="shortcut-label">Open Today's Puzzle</span>
          <kbd class="shortcut-key">⌘/Ctrl + Shift + R</kbd>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-label">Open Leaderboard</span>
          <kbd class="shortcut-key">⌘/Ctrl + Shift + L</kbd>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-label">Navigate to Play</span>
          <kbd class="shortcut-key">⌘/Ctrl + 1</kbd>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-label">Navigate to Leaderboard</span>
          <kbd class="shortcut-key">⌘/Ctrl + 2</kbd>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-label">Navigate to Profile</span>
          <kbd class="shortcut-key">⌘/Ctrl + 3</kbd>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-label">Navigate to Settings</span>
          <kbd class="shortcut-key">⌘/Ctrl + 4</kbd>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title">About</h2>
      <div class="about-info">
        <p>Rebuzzle Desktop</p>
        <p class="app-version" id="app-version">Version: Loading...</p>
        <p class="copyright">Made with ❤️ by Byron Wade</p>
      </div>
    </div>
  `;

  // Set up event listeners
  setupSettingsListeners(page);

  // Load app version
  loadAppVersion(page);

  return page;
}

function setupSettingsListeners(container: HTMLElement): void {
  // Theme select
  const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
  themeSelect?.addEventListener('change', async () => {
    const theme = themeSelect.value as 'light' | 'dark' | 'system';
    applyTheme(theme);
    appStore.setState({ theme });

    if (window.electronAPI) {
      await window.electronAPI.settings.set('theme', theme);
    }
  });

  // Auto launch toggle
  const autoLaunchToggle = container.querySelector('#auto-launch') as HTMLInputElement;
  autoLaunchToggle?.addEventListener('change', async () => {
    if (window.electronAPI) {
      await window.electronAPI.settings.setAutoLaunch(autoLaunchToggle.checked);
    }
  });

  // Daily reminder toggle
  const dailyReminderToggle = container.querySelector('#daily-reminder') as HTMLInputElement;
  dailyReminderToggle?.addEventListener('change', async () => {
    if (window.electronAPI) {
      await window.electronAPI.settings.set('notifications.dailyReminder', dailyReminderToggle.checked);
    }
    window.showToast(
      dailyReminderToggle.checked ? 'Daily reminders enabled' : 'Daily reminders disabled',
      'info'
    );
  });

  // Streak warning toggle
  const streakWarningToggle = container.querySelector('#streak-warning') as HTMLInputElement;
  streakWarningToggle?.addEventListener('change', async () => {
    if (window.electronAPI) {
      await window.electronAPI.settings.set('notifications.streakWarning', streakWarningToggle.checked);
    }
    window.showToast(
      streakWarningToggle.checked ? 'Streak warnings enabled' : 'Streak warnings disabled',
      'info'
    );
  });
}

function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
    root.classList.toggle('light', !prefersDark);
    document.body.classList.toggle('dark', prefersDark);
    document.body.classList.toggle('light', !prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
  }
}

async function loadAppVersion(container: HTMLElement): Promise<void> {
  const versionEl = container.querySelector('#app-version');
  if (!versionEl) return;

  if (window.electronAPI) {
    try {
      const appInfo = await window.electronAPI.getAppInfo();
      versionEl.textContent = `Version: ${appInfo.version}`;
    } catch {
      versionEl.textContent = 'Version: Unknown';
    }
  } else {
    versionEl.textContent = 'Version: Dev';
  }
}

// Add settings-specific styles
const settingsStyles = document.createElement('style');
settingsStyles.textContent = `
  .settings-page {
    max-width: 600px;
    margin: 0 auto;
  }

  .settings-section {
    margin-bottom: var(--spacing-xl);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--muted-foreground));
    margin-bottom: var(--spacing-md);
  }

  .settings-list {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid hsl(var(--border));
  }

  .setting-item:last-child {
    border-bottom: none;
  }

  .setting-info {
    flex: 1;
    margin-right: var(--spacing-md);
  }

  .setting-label {
    display: block;
    font-weight: var(--font-weight-medium);
  }

  .setting-description {
    display: block;
    font-size: var(--font-size-sm);
    color: hsl(var(--muted-foreground));
    margin-top: var(--spacing-xs);
  }

  .theme-select {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-md);
    color: hsl(var(--foreground));
    cursor: pointer;
  }

  .theme-select:focus {
    outline: none;
    border-color: hsl(var(--ring));
  }

  .shortcuts-list {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-bottom: 1px solid hsl(var(--border));
    font-size: var(--font-size-sm);
  }

  .shortcut-item:last-child {
    border-bottom: none;
  }

  .shortcut-label {
    color: hsl(var(--foreground));
  }

  .shortcut-key {
    background: hsl(var(--muted));
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .about-info {
    text-align: center;
    padding: var(--spacing-lg);
    color: hsl(var(--muted-foreground));
  }

  .about-info p {
    margin: var(--spacing-xs) 0;
  }

  .app-version {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .copyright {
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-md) !important;
  }
`;
document.head.appendChild(settingsStyles);
