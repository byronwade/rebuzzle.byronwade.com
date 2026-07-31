/**
 * Sync Status Indicator Component
 * Shows online/offline status and pending sync items
 */

import { appStore } from './store';

let indicatorElement: HTMLElement | null = null;
let lastSyncTime: number = Date.now();

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  pendingItems: number;
  lastSync: Date | null;
  error?: string;
}

let syncState: SyncState = {
  status: navigator.onLine ? 'online' : 'offline',
  pendingItems: 0,
  lastSync: null,
};

/**
 * Initialize the sync indicator
 */
export function initSyncIndicator(): void {
  // Create indicator element
  indicatorElement = document.createElement('div');
  indicatorElement.id = 'sync-indicator';
  indicatorElement.className = 'sync-indicator';
  document.body.appendChild(indicatorElement);

  // Initial render
  updateIndicator();

  // Listen for online/offline events
  window.addEventListener('online', () => {
    setSyncStatus('online');
    // Try to sync pending items when coming online
    syncPendingItems();
  });

  window.addEventListener('offline', () => {
    setSyncStatus('offline');
  });

  // Listen to store changes for offline attempts
  appStore.subscribe((state) => {
    const offlineAttempts = state.offlineAttempts || [];
    if (offlineAttempts.length !== syncState.pendingItems) {
      syncState.pendingItems = offlineAttempts.length;
      updateIndicator();
    }
  });

  // Check initial pending items
  const offlineAttempts = appStore.get('offlineAttempts') || [];
  syncState.pendingItems = offlineAttempts.length;
  updateIndicator();
}

/**
 * Update sync status
 */
export function setSyncStatus(status: SyncStatus, error?: string): void {
  syncState.status = status;
  if (status === 'online' || status === 'syncing') {
    syncState.error = undefined;
  }
  if (error) {
    syncState.error = error;
  }
  updateIndicator();
}

/**
 * Record a successful sync
 */
export function recordSync(): void {
  syncState.lastSync = new Date();
  lastSyncTime = Date.now();
  updateIndicator();
}

/**
 * Try to sync pending items
 */
async function syncPendingItems(): Promise<void> {
  const offlineAttempts = appStore.get('offlineAttempts') || [];

  if (offlineAttempts.length === 0) {
    return;
  }

  setSyncStatus('syncing');

  try {
    // Import api here to avoid circular dependency
    const { api } = await import('./api');

    for (const attempt of offlineAttempts) {
      try {
        await api.recordAttempt(attempt);
      } catch {
        // Keep the attempt for next sync
        continue;
      }
    }

    // Clear synced items
    appStore.setState({ offlineAttempts: [] });
    syncState.pendingItems = 0;
    recordSync();
    setSyncStatus('online');

    window.showToast?.('Data synced successfully!', 'success');
  } catch (error) {
    console.error('Sync failed:', error);
    setSyncStatus('error', 'Failed to sync data');
  }
}

/**
 * Update the indicator UI
 */
function updateIndicator(): void {
  if (!indicatorElement) return;

  const { status, pendingItems, lastSync, error } = syncState;

  // Determine icon and color
  let icon = '';
  let colorClass = '';
  let tooltip = '';

  switch (status) {
    case 'online':
      icon = pendingItems > 0 ? '⏳' : '✓';
      colorClass = pendingItems > 0 ? 'warning' : 'success';
      tooltip = pendingItems > 0
        ? `${pendingItems} item(s) pending sync`
        : `Online${lastSync ? ` • Last sync: ${formatLastSync(lastSync)}` : ''}`;
      break;
    case 'offline':
      icon = '○';
      colorClass = 'warning';
      tooltip = `Offline${pendingItems > 0 ? ` • ${pendingItems} item(s) pending` : ''}`;
      break;
    case 'syncing':
      icon = '↻';
      colorClass = 'syncing';
      tooltip = 'Syncing...';
      break;
    case 'error':
      icon = '!';
      colorClass = 'error';
      tooltip = error || 'Sync error';
      break;
  }

  // Show indicator only when relevant
  const shouldShow = status !== 'online' || pendingItems > 0 || status === 'syncing';

  indicatorElement.className = `sync-indicator ${colorClass} ${shouldShow ? 'visible' : ''}`;
  indicatorElement.innerHTML = `
    <span class="sync-icon">${icon}</span>
    ${pendingItems > 0 ? `<span class="sync-badge">${pendingItems}</span>` : ''}
  `;
  indicatorElement.title = tooltip;

  // Add click handler for retry
  if (status === 'error' || (status === 'online' && pendingItems > 0)) {
    indicatorElement.style.cursor = 'pointer';
    indicatorElement.onclick = () => syncPendingItems();
  } else {
    indicatorElement.style.cursor = 'default';
    indicatorElement.onclick = null;
  }
}

function formatLastSync(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < 60000) {
    return 'just now';
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  return date.toLocaleDateString();
}

// Add styles
const syncStyles = document.createElement('style');
syncStyles.textContent = `
  .sync-indicator {
    position: fixed;
    bottom: var(--spacing-md);
    right: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.2s ease;
    z-index: 50;
  }

  .sync-indicator.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .sync-icon {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
  }

  .sync-indicator.success .sync-icon {
    color: hsl(142 76% 36%);
  }

  .sync-indicator.warning .sync-icon {
    color: hsl(45 93% 47%);
  }

  .sync-indicator.error .sync-icon {
    color: hsl(var(--destructive));
  }

  .sync-indicator.syncing .sync-icon {
    color: hsl(var(--primary));
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .sync-badge {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    font-size: 9px;
    font-weight: bold;
    padding: 1px 4px;
    border-radius: var(--radius-full);
    min-width: 14px;
    text-align: center;
  }
`;
document.head.appendChild(syncStyles);
