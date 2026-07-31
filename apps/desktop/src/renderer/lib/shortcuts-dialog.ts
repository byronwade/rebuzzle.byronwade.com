/**
 * Keyboard Shortcuts Help Dialog
 * Shows all available keyboard shortcuts in a modal
 */

let dialogElement: HTMLElement | null = null;

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', '1'], description: 'Go to Play' },
      { keys: ['⌘', '2'], description: 'Go to Leaderboard' },
      { keys: ['⌘', '3'], description: 'Go to Profile' },
      { keys: ['⌘', '4'], description: 'Go to Settings' },
      { keys: ['⌘', '5'], description: 'Go to Achievements' },
      { keys: ['⌘', '6'], description: 'Go to History' },
      { keys: ['⌘', '7'], description: 'Go to How It Works' },
    ],
  },
  {
    title: 'Global Shortcuts',
    shortcuts: [
      { keys: ['⌘', 'Shift', 'R'], description: "Open Today's Puzzle" },
      { keys: ['⌘', 'Shift', 'L'], description: 'Open Leaderboard' },
      { keys: ['⌘', '?'], description: 'Show Keyboard Shortcuts' },
    ],
  },
  {
    title: 'Game',
    shortcuts: [
      { keys: ['Enter'], description: 'Submit Answer' },
      { keys: ['Escape'], description: 'Clear Input / Close Modal' },
    ],
  },
  {
    title: 'Window',
    shortcuts: [
      { keys: ['⌘', 'W'], description: 'Close Window' },
      { keys: ['⌘', 'M'], description: 'Minimize' },
      { keys: ['⌘', ','], description: 'Open Preferences' },
      { keys: ['⌘', 'R'], description: 'Reload' },
      { keys: ['⌘', 'Shift', 'D'], description: 'Toggle Dark Mode' },
    ],
  },
];

function renderShortcutKeys(keys: string[]): string {
  return keys
    .map((key) => `<kbd class="shortcut-kbd">${key}</kbd>`)
    .join('<span class="shortcut-plus">+</span>');
}

function renderShortcutGroup(group: ShortcutGroup): string {
  return `
    <div class="shortcut-group">
      <h3 class="shortcut-group-title">${group.title}</h3>
      <div class="shortcut-list">
        ${group.shortcuts
          .map(
            (s) => `
          <div class="shortcut-row">
            <span class="shortcut-description">${s.description}</span>
            <span class="shortcut-keys">${renderShortcutKeys(s.keys)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

export function showShortcutsDialog(): void {
  // Close existing dialog if open
  hideShortcutsDialog();

  // Create dialog
  dialogElement = document.createElement('div');
  dialogElement.className = 'shortcuts-dialog-overlay';
  dialogElement.innerHTML = `
    <div class="shortcuts-dialog">
      <div class="shortcuts-dialog-header">
        <h2 class="shortcuts-dialog-title">Keyboard Shortcuts</h2>
        <button class="shortcuts-dialog-close" id="close-shortcuts-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="shortcuts-dialog-content">
        ${shortcutGroups.map(renderShortcutGroup).join('')}
      </div>
      <div class="shortcuts-dialog-footer">
        <p class="shortcuts-note">On Windows/Linux, use Ctrl instead of ⌘</p>
      </div>
    </div>
  `;

  document.body.appendChild(dialogElement);

  // Add animation
  requestAnimationFrame(() => {
    dialogElement?.classList.add('show');
  });

  // Set up close handlers
  const closeBtn = dialogElement.querySelector('#close-shortcuts-btn');
  closeBtn?.addEventListener('click', hideShortcutsDialog);

  // Close on overlay click
  dialogElement.addEventListener('click', (e) => {
    if (e.target === dialogElement) {
      hideShortcutsDialog();
    }
  });

  // Close on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideShortcutsDialog();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function hideShortcutsDialog(): void {
  if (dialogElement) {
    dialogElement.classList.remove('show');
    setTimeout(() => {
      dialogElement?.remove();
      dialogElement = null;
    }, 200);
  }
}

export function toggleShortcutsDialog(): void {
  if (dialogElement) {
    hideShortcutsDialog();
  } else {
    showShortcutsDialog();
  }
}

// Set up global keyboard shortcut for opening dialog
document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + ? or Cmd/Ctrl + Shift + /
  if ((e.metaKey || e.ctrlKey) && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
    e.preventDefault();
    toggleShortcutsDialog();
  }
});

// Add styles
const dialogStyles = document.createElement('style');
dialogStyles.textContent = `
  .shortcuts-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .shortcuts-dialog-overlay.show {
    opacity: 1;
  }

  .shortcuts-dialog {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transform: scale(0.95);
    transition: transform 0.2s ease;
  }

  .shortcuts-dialog-overlay.show .shortcuts-dialog {
    transform: scale(1);
  }

  .shortcuts-dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid hsl(var(--border));
  }

  .shortcuts-dialog-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    margin: 0;
  }

  .shortcuts-dialog-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    transition: all var(--transition-fast);
  }

  .shortcuts-dialog-close:hover {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  .shortcuts-dialog-close svg {
    width: 18px;
    height: 18px;
  }

  .shortcuts-dialog-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
  }

  .shortcut-group {
    margin-bottom: var(--spacing-lg);
  }

  .shortcut-group:last-child {
    margin-bottom: 0;
  }

  .shortcut-group-title {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--muted-foreground));
    margin: 0 0 var(--spacing-sm) 0;
  }

  .shortcut-list {
    background: hsl(var(--muted) / 0.3);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .shortcut-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid hsl(var(--border) / 0.5);
  }

  .shortcut-row:last-child {
    border-bottom: none;
  }

  .shortcut-description {
    font-size: var(--font-size-sm);
    color: hsl(var(--foreground));
  }

  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .shortcut-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: hsl(var(--foreground));
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .shortcut-plus {
    font-size: var(--font-size-xs);
    color: hsl(var(--muted-foreground));
  }

  .shortcuts-dialog-footer {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-top: 1px solid hsl(var(--border));
    text-align: center;
  }

  .shortcuts-note {
    font-size: var(--font-size-xs);
    color: hsl(var(--muted-foreground));
    margin: 0;
  }
`;
document.head.appendChild(dialogStyles);
