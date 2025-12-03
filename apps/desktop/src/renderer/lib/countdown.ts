/**
 * Countdown Timer Component
 * Shows time until next puzzle with auto-update
 */

import { appStore } from './store';

let countdownInterval: NodeJS.Timeout | null = null;

export interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  isReady: boolean;
  formatted: string;
}

/**
 * Calculate time until next puzzle
 */
export function getTimeUntilNextPuzzle(): CountdownState {
  const state = appStore.getState();
  const serverOffset = state.serverTimeOffset || 0;
  const nextPuzzleTime = state.nextPuzzleTime;

  // If we have a next puzzle time from the server, use it
  if (nextPuzzleTime) {
    const now = Date.now() + serverOffset;
    const nextTime = new Date(nextPuzzleTime).getTime();
    const diff = nextTime - now;

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isReady: true, formatted: '00:00:00' };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      hours,
      minutes,
      seconds,
      isReady: false,
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    };
  }

  // Fallback: Calculate based on midnight UTC
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);

  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    isReady: false,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
}

/**
 * Start the countdown timer
 */
export function startCountdown(onUpdate: (state: CountdownState) => void): () => void {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Initial update
  onUpdate(getTimeUntilNextPuzzle());

  // Update every second
  countdownInterval = setInterval(() => {
    const state = getTimeUntilNextPuzzle();
    onUpdate(state);

    // If ready, clear the interval
    if (state.isReady) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
  }, 1000);

  // Return cleanup function
  return () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  };
}

/**
 * Render countdown component HTML (matching web app style)
 */
export function renderCountdown(state: CountdownState): string {
  if (state.isReady) {
    return `
      <div class="countdown-container countdown-ready">
        <div class="countdown-icon">🎉</div>
        <p class="countdown-message">New puzzle available!</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Play Now</button>
      </div>
    `;
  }

  return `
    <div class="countdown-container countdown-gradient">
      <div class="countdown-clock-icon">⏰</div>
      <div class="countdown-content">
        <p class="countdown-label">Next Puzzle In</p>
        <div class="countdown-time-large">${state.formatted}</div>
      </div>
    </div>
  `;
}

// Add countdown styles (matching web app style)
const countdownStyles = document.createElement('style');
countdownStyles.textContent = `
  .countdown-container {
    text-align: center;
    padding: var(--spacing-lg);
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-xl);
  }

  /* Purple gradient style matching web app */
  .countdown-container.countdown-gradient {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-md);
    background: linear-gradient(135deg, #9333ea, #ec4899);
    color: white;
    padding: var(--spacing-md) var(--spacing-xl);
    border: none;
    box-shadow: 0 10px 25px -5px rgba(147, 51, 234, 0.3);
  }

  .countdown-gradient .countdown-clock-icon {
    font-size: 1.5rem;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .countdown-gradient .countdown-content {
    text-align: left;
  }

  .countdown-gradient .countdown-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.9;
    margin-bottom: 2px;
    color: white;
  }

  .countdown-gradient .countdown-time-large {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .countdown-container.countdown-ready {
    background: linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.05));
    border-color: hsl(142 76% 36% / 0.3);
  }

  .countdown-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-sm);
  }

  .countdown-message {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: hsl(142 76% 36%);
    margin-bottom: var(--spacing-md);
  }
`;
document.head.appendChild(countdownStyles);
