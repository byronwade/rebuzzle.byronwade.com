/**
 * Desktop App Entry Point
 * Bootstraps the application, initializes routing, and sets up global handlers
 */

import { router } from './lib/router';
import { api } from './lib/api';
import { appStore } from './lib/store';

// Import pages
import { createGamePage } from './pages/game';
import { createLeaderboardPage } from './pages/leaderboard';
import { createProfilePage } from './pages/profile';
import { createSettingsPage } from './pages/settings';
import { createLoginPage } from './pages/login';
import { createAchievementsPage } from './pages/achievements';
import { createSuccessPage } from './pages/success';
import { createHistoryPage } from './pages/history';
import { createHowItWorksPage } from './pages/how-it-works';

// Import keyboard shortcuts dialog (auto-activates Cmd+? handler)
import './lib/shortcuts-dialog';

// Import sync indicator
import { initSyncIndicator } from './lib/sync-indicator';

// Import tooltip system
import { initTooltips } from './lib/tooltip';

// ============================================
// INITIALIZATION
// ============================================

async function init(): Promise<void> {
  console.log('Rebuzzle Desktop initializing...');

  // Set platform attribute for platform-specific styling
  if (window.electronAPI) {
    document.body.setAttribute('data-platform', window.electronAPI.platform);
  }

  // Initialize theme
  await initTheme();

  // Initialize tooltip system
  initTooltips();

  // Register routes
  registerRoutes();

  // Initialize router
  router.init('app');

  // Set up navigation highlighting
  setupNavigation();

  // Check authentication
  await api.checkSession();

  // Set up deep link handler
  setupDeepLinks();

  // Set up keyboard shortcuts
  setupKeyboardShortcuts();

  // Listen for online/offline status
  setupOnlineStatus();

  // Initialize sync status indicator
  initSyncIndicator();

  console.log('Rebuzzle Desktop initialized');
}

// ============================================
// ROUTES
// ============================================

function registerRoutes(): void {
  router.registerAll([
    { path: '/', handler: createGamePage, title: 'Play' },
    { path: '/success', handler: createSuccessPage, title: 'Results' },
    { path: '/leaderboard', handler: createLeaderboardPage, title: 'Leaderboard' },
    { path: '/achievements', handler: createAchievementsPage, title: 'Achievements' },
    { path: '/profile', handler: createProfilePage, title: 'Profile' },
    { path: '/settings', handler: createSettingsPage, title: 'Settings' },
    { path: '/login', handler: createLoginPage, title: 'Login' },
    { path: '/history', handler: createHistoryPage, title: 'History' },
    { path: '/how-it-works', handler: createHowItWorksPage, title: 'How It Works' },
    { path: '*', handler: createGamePage, title: 'Play' }, // Fallback
  ]);

  // Auth guard for protected routes
  router.beforeNavigate(async (_from, to) => {
    const protectedRoutes = ['/profile'];
    const { isAuthenticated } = appStore.getState();

    if (protectedRoutes.includes(to) && !isAuthenticated) {
      router.navigate('/login');
      return false;
    }

    return true;
  });

  // Update navigation on route change
  router.afterNavigate((path) => {
    updateNavigation(path);
  });
}

// ============================================
// NAVIGATION
// ============================================

function setupNavigation(): void {
  const navItems = document.querySelectorAll('.sidebar-item');

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const route = item.getAttribute('data-route');
      if (route) {
        router.navigate(route);
      }
    });
  });

  // Set initial active state
  const currentPath = window.location.hash.slice(1) || '/';
  updateNavigation(currentPath);
}

function updateNavigation(path: string): void {
  const navItems = document.querySelectorAll('.sidebar-item');

  navItems.forEach((item) => {
    const route = item.getAttribute('data-route');
    const isActive = route === path || (route === '/' && (path === '' || path === '/'));

    if (isActive) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// ============================================
// THEME
// ============================================

async function initTheme(): Promise<void> {
  let theme: 'light' | 'dark' | 'system' = 'dark';

  // Try to get saved theme from electron-store
  if (window.electronAPI) {
    try {
      const savedTheme = await window.electronAPI.settings.get<string>('theme');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        theme = savedTheme;
      }
    } catch {
      // Use default
    }
  }

  applyTheme(theme);
  appStore.setState({ theme });
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

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const { theme } = appStore.getState();
  if (theme === 'system') {
    applyTheme('system');
  }
});

// ============================================
// DEEP LINKS
// ============================================

function setupDeepLinks(): void {
  if (window.electronAPI?.deepLink) {
    window.electronAPI.deepLink.onOpen((url) => {
      console.log('Deep link received:', url);

      // Parse the rebuzzle:// URL
      try {
        const parsed = new URL(url);
        const path = parsed.pathname || parsed.hostname;

        switch (path) {
          case 'puzzle':
          case 'today':
            router.navigate('/');
            break;
          case 'leaderboard':
            router.navigate('/leaderboard');
            break;
          case 'profile':
            router.navigate('/profile');
            break;
          case 'settings':
            router.navigate('/settings');
            break;
          default:
            router.navigate('/');
        }
      } catch (error) {
        console.error('Invalid deep link:', error);
      }
    });
  }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + number for quick navigation
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          router.navigate('/');
          break;
        case '2':
          e.preventDefault();
          router.navigate('/leaderboard');
          break;
        case '3':
          e.preventDefault();
          router.navigate('/profile');
          break;
        case '4':
          e.preventDefault();
          router.navigate('/settings');
          break;
        case '5':
          e.preventDefault();
          router.navigate('/achievements');
          break;
        case '6':
          e.preventDefault();
          router.navigate('/history');
          break;
        case '7':
          e.preventDefault();
          router.navigate('/how-it-works');
          break;
      }
    }

    // Escape to go back or close modals
    if (e.key === 'Escape') {
      const modal = document.querySelector('.modal.open');
      if (modal) {
        modal.classList.remove('open');
      }
    }
  });
}

// ============================================
// ONLINE STATUS
// ============================================

function setupOnlineStatus(): void {
  const updateStatus = () => {
    const isOnline = navigator.onLine;
    appStore.setState({ isOnline });

    // Show toast when status changes
    if (!isOnline) {
      showToast('You are offline. Some features may be limited.', 'warning');
    } else {
      showToast('Back online!', 'success');
    }
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

export function showToast(
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  duration: number = 3000
): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

// Make showToast available globally
declare global {
  interface Window {
    showToast: typeof showToast;
  }
}
window.showToast = showToast;

// ============================================
// START APP
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
