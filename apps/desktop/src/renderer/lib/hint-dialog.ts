/**
 * Hint Dialog Component
 * Modal dialog for revealing hints one at a time
 */

import { appStore } from './store';
import { playHintSound } from './sounds';

export interface HintDialogState {
  hints: string[];
  hintsUsed: number;
  isComplete: boolean;
  onRevealHint: () => void;
}

let dialogElement: HTMLDivElement | null = null;
let currentState: HintDialogState | null = null;

/**
 * Initialize the hint dialog (call once on app start)
 */
export function initHintDialog(): void {
  // Create dialog element if it doesn't exist
  if (!dialogElement) {
    dialogElement = document.createElement('div');
    dialogElement.className = 'hint-dialog-overlay';
    dialogElement.innerHTML = `
      <div class="hint-dialog">
        <div class="hint-dialog-header">
          <h3><span class="hint-dialog-icon">💡</span> Hints</h3>
          <button class="hint-dialog-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="hint-dialog-content">
          <div class="hint-list" id="hint-dialog-list"></div>
        </div>
        <div class="hint-dialog-footer">
          <p class="hint-warning">
            <span class="warning-icon">⚠️</span>
            Each hint costs <strong>-10 points</strong>
          </p>
          <button class="btn btn-hint-reveal" id="reveal-hint-btn">
            <span class="hint-icon">💡</span>
            <span id="reveal-hint-text">Reveal Next Hint</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(dialogElement);

    // Set up event listeners
    setupDialogListeners();
  }

  // Add styles
  addHintDialogStyles();
}

function setupDialogListeners(): void {
  if (!dialogElement) return;

  // Close button
  const closeBtn = dialogElement.querySelector('.hint-dialog-close');
  closeBtn?.addEventListener('click', closeHintDialog);

  // Click outside to close
  dialogElement.addEventListener('click', (e) => {
    if (e.target === dialogElement) {
      closeHintDialog();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialogElement?.classList.contains('open')) {
      closeHintDialog();
    }
  });

  // Reveal hint button
  const revealBtn = dialogElement.querySelector('#reveal-hint-btn');
  revealBtn?.addEventListener('click', () => {
    if (currentState && currentState.hintsUsed < currentState.hints.length && !currentState.isComplete) {
      playHintSound();
      currentState.onRevealHint();
      // Re-render after reveal
      const gameState = appStore.get('game');
      updateHintDialog({
        ...currentState,
        hintsUsed: gameState.hintsUsed,
      });
    }
  });
}

/**
 * Open the hint dialog with current state
 */
export function openHintDialog(state: HintDialogState): void {
  currentState = state;
  updateHintDialog(state);
  dialogElement?.classList.add('open');

  // Focus the reveal button for accessibility
  const revealBtn = dialogElement?.querySelector('#reveal-hint-btn') as HTMLButtonElement;
  revealBtn?.focus();
}

/**
 * Close the hint dialog
 */
export function closeHintDialog(): void {
  dialogElement?.classList.remove('open');
}

/**
 * Update the hint dialog content
 */
export function updateHintDialog(state: HintDialogState): void {
  currentState = state;
  const { hints, hintsUsed, isComplete } = state;

  if (!dialogElement) return;

  const hintList = dialogElement.querySelector('#hint-dialog-list');
  const revealBtn = dialogElement.querySelector('#reveal-hint-btn') as HTMLButtonElement;
  const revealText = dialogElement.querySelector('#reveal-hint-text');

  if (!hintList || !revealBtn || !revealText) return;

  // Render hints
  hintList.innerHTML = hints.map((hint, index) => {
    const isRevealed = index < hintsUsed;
    return `
      <div class="hint-item ${isRevealed ? 'revealed' : 'locked'}">
        <span class="hint-number">${index + 1}.</span>
        ${isRevealed
          ? `<span class="hint-text">${hint}</span>`
          : `<span class="hint-locked"><span class="lock-icon">🔒</span> Locked</span>`
        }
      </div>
    `;
  }).join('');

  // Update reveal button
  const hintsRemaining = hints.length - hintsUsed;
  const canReveal = hintsRemaining > 0 && !isComplete;

  revealBtn.disabled = !canReveal;

  if (isComplete) {
    revealText.textContent = 'Puzzle Complete';
  } else if (hintsRemaining === 0) {
    revealText.textContent = 'All Hints Revealed';
  } else {
    revealText.textContent = `Reveal Hint (${hintsRemaining} left)`;
  }
}

/**
 * Render the hint badge HTML for the header
 */
export function renderHintBadge(hintsUsed: number, totalHints: number): string {
  if (totalHints === 0) return '';

  const hintsAvailable = totalHints - hintsUsed;
  const pulseClass = hintsUsed === 0 ? 'hint-badge-pulse' : '';

  return `
    <span class="badge badge-hint ${pulseClass}" id="hint-badge" data-tooltip="Need help? Click to reveal hints (-10 pts each)">
      <span class="hint-badge-icon">💡</span>
      <span class="hint-badge-label">Need a Hint?</span>
      <span class="hint-badge-count">(${hintsAvailable} available)</span>
    </span>
  `;
}

/**
 * Set up hint badge click handler
 */
export function setupHintBadgeListener(
  container: HTMLElement,
  hints: string[],
  onRevealHint: () => void
): void {
  const badge = container.querySelector('#hint-badge');
  badge?.addEventListener('click', () => {
    const gameState = appStore.get('game');
    openHintDialog({
      hints,
      hintsUsed: gameState.hintsUsed,
      isComplete: gameState.isComplete,
      onRevealHint,
    });
  });
}

/**
 * Update the hint badge count
 */
export function updateHintBadge(container: HTMLElement, hintsUsed: number, totalHints: number): void {
  const badge = container.querySelector('#hint-badge');
  const countEl = container.querySelector('.hint-badge-count');
  const hintsAvailable = totalHints - hintsUsed;

  if (countEl) {
    countEl.textContent = `(${hintsAvailable} available)`;
  }

  // Remove pulse animation once hints have been used
  if (badge && hintsUsed > 0) {
    badge.classList.remove('hint-badge-pulse');
  }
}

function addHintDialogStyles(): void {
  // Check if styles already exist
  if (document.getElementById('hint-dialog-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'hint-dialog-styles';
  styles.textContent = `
    /* Hint Dialog Overlay */
    .hint-dialog-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .hint-dialog-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    /* Hint Dialog */
    .hint-dialog {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius-xl);
      width: 90%;
      max-width: 400px;
      max-height: 80vh;
      overflow: hidden;
      transform: scale(0.95);
      transition: transform 0.2s ease;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .hint-dialog-overlay.open .hint-dialog {
      transform: scale(1);
    }

    /* Dialog Header */
    .hint-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.3);
    }

    .hint-dialog-header h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .hint-dialog-icon {
      font-size: 1.25rem;
    }

    .hint-dialog-close {
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

    .hint-dialog-close:hover {
      background: hsl(var(--muted));
      color: hsl(var(--foreground));
    }

    /* Dialog Content */
    .hint-dialog-content {
      padding: var(--spacing-lg);
      overflow-y: auto;
      max-height: 300px;
    }

    .hint-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .hint-item {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      background: hsl(var(--muted) / 0.3);
      border: 1px solid hsl(var(--border) / 0.5);
      transition: all 0.3s ease;
    }

    .hint-item.revealed {
      background: hsl(48 96% 53% / 0.1);
      border-color: hsl(48 96% 53% / 0.3);
    }

    .hint-item.locked {
      opacity: 0.6;
    }

    .hint-number {
      font-weight: var(--font-weight-bold);
      color: hsl(var(--muted-foreground));
      min-width: 20px;
    }

    .hint-text {
      flex: 1;
      color: hsl(var(--foreground));
      line-height: 1.5;
    }

    .hint-locked {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: hsl(var(--muted-foreground));
      font-style: italic;
    }

    .lock-icon {
      font-size: 0.875rem;
    }

    /* Dialog Footer */
    .hint-dialog-footer {
      padding: var(--spacing-md) var(--spacing-lg);
      border-top: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.2);
    }

    .hint-warning {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: hsl(var(--muted-foreground));
      margin-bottom: var(--spacing-md);
    }

    .warning-icon {
      font-size: 1rem;
    }

    .btn-hint-reveal {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: linear-gradient(135deg, hsl(48 96% 53%), hsl(36 100% 50%));
      color: hsl(0 0% 10%);
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-hint-reveal:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px hsl(48 96% 53% / 0.3);
    }

    .btn-hint-reveal:disabled {
      background: hsl(var(--muted));
      color: hsl(var(--muted-foreground));
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .hint-icon {
      font-size: 1rem;
    }

    /* Hint Badge in Header */
    .badge-hint {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, hsl(48 96% 53%), hsl(36 100% 50%));
      color: hsl(0 0% 10%);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .badge-hint:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px hsl(48 96% 53% / 0.3);
    }

    .hint-badge-icon {
      font-size: 12px;
    }

    .hint-badge-label {
      margin-right: 2px;
    }

    .hint-badge-count {
      font-family: var(--font-mono);
      opacity: 0.9;
    }

    /* Pulse animation to draw attention */
    @keyframes hint-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 hsl(48 96% 53% / 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px hsl(48 96% 53% / 0);
      }
    }

    .hint-badge-pulse {
      animation: hint-pulse 2s ease-in-out infinite;
    }

    .hint-badge-pulse:hover {
      animation: none;
    }
  `;
  document.head.appendChild(styles);
}
