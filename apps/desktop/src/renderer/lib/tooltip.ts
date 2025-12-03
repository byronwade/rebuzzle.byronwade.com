/**
 * Custom Tooltip Component
 * A reliable tooltip implementation that works in Electron
 */

let tooltipEl: HTMLDivElement | null = null;
let showTimeout: NodeJS.Timeout | null = null;
let hideTimeout: NodeJS.Timeout | null = null;

/**
 * Initialize the tooltip system
 * Call once when the app starts
 */
export function initTooltips(): void {
  // Create tooltip element if it doesn't exist
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'custom-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipEl);
  }

  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .custom-tooltip {
      position: fixed;
      z-index: 10000;
      padding: 6px 10px;
      background: hsl(var(--popover, 0 0% 15%));
      color: hsl(var(--popover-foreground, 0 0% 98%));
      border: 1px solid hsl(var(--border, 0 0% 20%));
      border-radius: var(--radius-md, 6px);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
      max-width: 250px;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .custom-tooltip.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    /* Arrow indicator */
    .custom-tooltip::before {
      content: '';
      position: absolute;
      top: -5px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 5px solid hsl(var(--border, 0 0% 20%));
    }

    .custom-tooltip::after {
      content: '';
      position: absolute;
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 5px solid hsl(var(--popover, 0 0% 15%));
    }

    /* Data-tooltip attribute for easy usage */
    [data-tooltip] {
      cursor: help;
    }
  `;
  document.head.appendChild(styles);

  // Set up event delegation for data-tooltip attributes
  document.addEventListener('mouseenter', handleMouseEnter, true);
  document.addEventListener('mouseleave', handleMouseLeave, true);
  document.addEventListener('scroll', hideTooltip, true);
}

function handleMouseEnter(e: Event): void {
  const target = e.target;
  // Ensure target is an HTMLElement with getAttribute method
  if (!(target instanceof HTMLElement)) return;

  const tooltipText = target.getAttribute('data-tooltip');
  if (!tooltipText || !tooltipEl) return;

  // Clear any pending hide timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  // Show tooltip after a short delay
  showTimeout = setTimeout(() => {
    showTooltip(target, tooltipText);
  }, 300);
}

function handleMouseLeave(e: Event): void {
  const target = e.target;
  // Ensure target is an HTMLElement with getAttribute method
  if (!(target instanceof HTMLElement)) return;
  if (!target.getAttribute('data-tooltip')) return;

  // Clear any pending show timeout
  if (showTimeout) {
    clearTimeout(showTimeout);
    showTimeout = null;
  }

  // Hide tooltip after a short delay
  hideTimeout = setTimeout(() => {
    hideTooltip();
  }, 100);
}

function showTooltip(target: HTMLElement, text: string): void {
  if (!tooltipEl) return;

  tooltipEl.textContent = text;

  // Position the tooltip
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();

  // Default: position below the element
  let top = rect.bottom + 8;
  let left = rect.left + (rect.width / 2);

  // Adjust if tooltip would go off screen
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.transform = 'translateX(-50%)';

  // Make visible to get accurate dimensions
  tooltipEl.classList.add('visible');

  // Adjust horizontal position if off screen
  const newRect = tooltipEl.getBoundingClientRect();
  if (newRect.right > window.innerWidth - 10) {
    tooltipEl.style.left = `${window.innerWidth - newRect.width - 10}px`;
    tooltipEl.style.transform = 'translateX(0)';
  }
  if (newRect.left < 10) {
    tooltipEl.style.left = '10px';
    tooltipEl.style.transform = 'translateX(0)';
  }

  // If tooltip would go below viewport, show above instead
  if (newRect.bottom > window.innerHeight - 10) {
    top = rect.top - newRect.height - 8;
    tooltipEl.style.top = `${top}px`;
  }
}

function hideTooltip(): void {
  if (tooltipEl) {
    tooltipEl.classList.remove('visible');
  }
}

/**
 * Manually show a tooltip at a position
 */
export function showTooltipAt(x: number, y: number, text: string): void {
  if (!tooltipEl) return;

  tooltipEl.textContent = text;
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
  tooltipEl.style.transform = 'translateX(-50%)';
  tooltipEl.classList.add('visible');
}

/**
 * Manually hide the tooltip
 */
export function hideTooltipManually(): void {
  hideTooltip();
}
