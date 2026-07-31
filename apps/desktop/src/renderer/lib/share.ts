/**
 * Share Results Utility
 * Generates shareable text and copies to clipboard
 */

interface ShareOptions {
  success: boolean;
  attempts: number;
  maxAttempts: number;
  streak?: number;
}

export async function shareResults(options: ShareOptions): Promise<void> {
  const { success, attempts, maxAttempts, streak = 0 } = options;

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Create emoji grid (like Wordle)
  // Green squares for successful attempts, red for failed
  const greenSquare = '\u{1F7E9}'; // 🟩
  const redSquare = '\u{1F7E5}'; // 🟥
  const whiteSquare = '\u2B1C'; // ⬜

  const squares = success
    ? greenSquare.repeat(attempts) + whiteSquare.repeat(maxAttempts - attempts)
    : redSquare.repeat(attempts);

  let message = `Rebuzzle ${today} - ${success ? attempts : 'X'}/${maxAttempts}\n\n${squares}\n\n`;

  if (success) {
    message += `Solved today's puzzle!`;
    if (streak > 0) {
      message += ` \u{1F525} ${streak} day streak`;
    }
    message += `\n\nPlay at https://rebuzzle.byronwade.com`;
  } else {
    message += `Try today's puzzle at https://rebuzzle.byronwade.com`;
  }

  // Use Electron clipboard API if available
  if (window.electronAPI?.clipboard) {
    try {
      await window.electronAPI.clipboard.writeText(message);
      window.showToast?.('Results copied to clipboard!', 'success');
      return;
    } catch (error) {
      console.error('Electron clipboard error:', error);
    }
  }

  // Fallback to browser clipboard API
  try {
    await navigator.clipboard.writeText(message);
    window.showToast?.('Results copied to clipboard!', 'success');
  } catch (error) {
    console.error('Clipboard error:', error);
    window.showToast?.('Failed to copy results', 'error');
  }
}

/**
 * Generate share text without copying (for preview)
 */
export function generateShareText(options: ShareOptions): string {
  const { success, attempts, maxAttempts, streak = 0 } = options;

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const greenSquare = '\u{1F7E9}';
  const redSquare = '\u{1F7E5}';
  const whiteSquare = '\u2B1C';

  const squares = success
    ? greenSquare.repeat(attempts) + whiteSquare.repeat(maxAttempts - attempts)
    : redSquare.repeat(attempts);

  let message = `Rebuzzle ${today} - ${success ? attempts : 'X'}/${maxAttempts}\n\n${squares}`;

  if (success && streak > 0) {
    message += `\n\n\u{1F525} ${streak} day streak`;
  }

  return message;
}
