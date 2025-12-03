/**
 * Celebration Overlay
 * Full-screen celebration for puzzle completion
 */

import { triggerConfetti } from './confetti';

interface CelebrationOptions {
  score: number;
  streak: number;
  attempts: number;
  maxAttempts: number;
  timeTaken: number;
  onComplete?: () => void;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function animateCounter(elementId: string, target: number, duration: number): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const steps = 20;
  const increment = target / steps;
  let current = 0;

  const interval = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target.toString();
      clearInterval(interval);
    } else {
      element.textContent = Math.floor(current).toString();
    }
  }, duration / steps);
}

export function showCelebration(options: CelebrationOptions): void {
  const { score, streak, attempts, maxAttempts, timeTaken, onComplete } = options;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'celebration-overlay';
  overlay.className = 'celebration-overlay';
  overlay.innerHTML = `
    <div class="celebration-content">
      <div class="celebration-checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="celebration-score">
        <p class="score-label">Score</p>
        <p class="score-value" id="score-counter">0</p>
      </div>
      ${streak > 0 ? `
        <div class="celebration-streak">
          <span class="streak-icon">\u{1F525}</span>
          <span class="streak-text">${streak} Day Streak!</span>
        </div>
      ` : ''}
      <p class="celebration-info">
        Solved in ${attempts} of ${maxAttempts} attempts \u2022 ${formatTime(timeTaken)}
      </p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add celebration styles if not already present
  if (!document.getElementById('celebration-styles')) {
    const styles = document.createElement('style');
    styles.id = 'celebration-styles';
    styles.textContent = `
      .celebration-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .celebration-overlay.show {
        opacity: 1;
      }

      .celebration-content {
        text-align: center;
        color: white;
      }

      .celebration-checkmark {
        width: 80px;
        height: 80px;
        background: hsl(142 76% 36%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      .celebration-checkmark svg {
        width: 48px;
        height: 48px;
        color: white;
      }

      .celebration-score {
        margin-bottom: 1.5rem;
      }

      .score-label {
        font-size: 1.125rem;
        opacity: 0.8;
        margin-bottom: 0.25rem;
      }

      .score-value {
        font-size: 4rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .celebration-streak {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(249, 115, 22, 0.9);
        padding: 0.5rem 1.5rem;
        border-radius: 9999px;
        margin-bottom: 1.5rem;
      }

      .streak-icon {
        font-size: 1.25rem;
      }

      .streak-text {
        font-size: 1.125rem;
        font-weight: 700;
      }

      .celebration-info {
        font-size: 0.875rem;
        opacity: 0.7;
      }

      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }

  // Trigger confetti
  triggerConfetti();

  // Trigger show animation
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });

  // Animate score counter
  setTimeout(() => {
    animateCounter('score-counter', score, 500);
  }, 300);

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
      onComplete?.();
    }, 300);
  }, 3000);
}
