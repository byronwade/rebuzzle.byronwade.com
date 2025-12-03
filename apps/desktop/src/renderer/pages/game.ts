/**
 * Game Page
 * Main puzzle gameplay with @rebuzzle/game-logic integration
 */

import { api } from '../lib/api';
import { appStore, type Puzzle, resetGameState } from '../lib/store';
import {
  calculateScore,
  fuzzyMatch,
  calculateLevel,
  pointsToNextLevel,
  type ScoreBreakdown,
} from '@rebuzzle/game-logic';

// Game constants
const MAX_ATTEMPTS = 3;

export async function createGamePage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page game-page';

  // Initial loading state
  page.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading today's puzzle...</p>
    </div>
  `;

  // Load puzzle and render
  try {
    const puzzle = await loadPuzzle();
    if (puzzle) {
      renderGame(page, puzzle);
    } else {
      renderError(page, 'Failed to load puzzle');
    }
  } catch (error) {
    console.error('Game page error:', error);
    renderError(page, 'Failed to load puzzle');
  }

  return page;
}

async function loadPuzzle(): Promise<Puzzle | null> {
  // Try to get from API
  const puzzle = await api.getTodayPuzzle();

  if (puzzle) {
    // Reset game state with new puzzle
    resetGameState();
    appStore.setState({
      game: {
        ...appStore.get('game'),
        puzzle,
        startTime: Date.now(),
      },
    });
  }

  return puzzle;
}

function renderGame(container: HTMLElement, puzzle: Puzzle): void {
  const state = appStore.get('game');

  container.innerHTML = `
    <div class="game-header">
      <div class="game-info">
        <span class="badge badge-default">${puzzle.puzzleType}</span>
        <span class="badge badge-default">${puzzle.difficulty}</span>
      </div>
      <div class="timer" id="game-timer">00:00</div>
    </div>

    <div class="puzzle-container">
      <div class="puzzle-text" id="puzzle-display">${formatPuzzle(puzzle.puzzle)}</div>
    </div>

    <div class="attempts-container" id="attempts-display">
      ${renderAttempts(0, MAX_ATTEMPTS)}
    </div>

    <div class="guess-history" id="guess-history"></div>

    <form class="answer-input-container" id="answer-form">
      <input
        type="text"
        class="input answer-input"
        id="answer-input"
        placeholder="Enter your answer..."
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="submit" class="btn btn-primary" id="submit-btn">
        Submit
      </button>
    </form>

    <div class="hint-container" id="hint-container">
      ${puzzle.hints && puzzle.hints.length > 0 ? `
        <button class="btn btn-ghost btn-sm" id="hint-btn">
          Need a hint?
        </button>
      ` : ''}
    </div>
  `;

  // Set up event listeners
  setupGameListeners(container, puzzle);

  // Start timer
  startTimer(container);
}

function formatPuzzle(puzzleText: string): string {
  // Handle emoji-based puzzles by making them larger
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const hasEmojis = emojiRegex.test(puzzleText);

  if (hasEmojis) {
    return `<span class="puzzle-emoji">${puzzleText}</span>`;
  }

  return puzzleText;
}

function renderAttempts(used: number, max: number): string {
  return Array(max)
    .fill(0)
    .map((_, i) => `<div class="attempt-dot ${i < used ? 'used' : ''}"></div>`)
    .join('');
}

function setupGameListeners(container: HTMLElement, puzzle: Puzzle): void {
  const form = container.querySelector('#answer-form') as HTMLFormElement;
  const input = container.querySelector('#answer-input') as HTMLInputElement;
  const hintBtn = container.querySelector('#hint-btn') as HTMLButtonElement | null;

  // Focus input
  input?.focus();

  // Handle form submission
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(container, puzzle, input.value.trim());
    input.value = '';
  });

  // Handle hint button
  hintBtn?.addEventListener('click', () => {
    showHint(container, puzzle);
  });

  // Handle keyboard shortcuts
  const keyHandler = (e: KeyboardEvent) => {
    // Enter to submit (handled by form)
    // Escape to clear input
    if (e.key === 'Escape') {
      input.value = '';
      input.focus();
    }
  };

  document.addEventListener('keydown', keyHandler);

  // Cleanup on page change
  const cleanup = appStore.subscribe((state) => {
    if (state.currentPage !== '/') {
      document.removeEventListener('keydown', keyHandler);
      cleanup();
    }
  });
}

function handleSubmit(container: HTMLElement, puzzle: Puzzle, answer: string): void {
  if (!answer) return;

  const state = appStore.get('game');
  if (state.isComplete) return;

  const newAttempts = state.attempts + 1;
  const guesses = [...state.guesses, answer];

  // Check answer using fuzzy match
  const isCorrect = fuzzyMatch(answer, puzzle.answer, 85);

  // Update guess history
  addGuessToHistory(container, answer, isCorrect);

  // Update attempts display
  const attemptsDisplay = container.querySelector('#attempts-display');
  if (attemptsDisplay) {
    attemptsDisplay.innerHTML = renderAttempts(newAttempts, MAX_ATTEMPTS);

    // Add correct class if won
    if (isCorrect) {
      attemptsDisplay.querySelectorAll('.attempt-dot').forEach((dot, i) => {
        if (i < newAttempts) {
          dot.classList.remove('used');
          dot.classList.add('correct');
        }
      });
    }
  }

  if (isCorrect) {
    // Calculate score
    const elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
    const stats = appStore.get('stats');

    const scoreBreakdown = calculateScore({
      timeTakenSeconds: elapsedTime,
      wrongAttempts: newAttempts - 1,
      streakDays: stats?.streak || 0,
      difficultyLevel: typeof puzzle.difficulty === 'number' ? puzzle.difficulty : 5,
    });

    // Update state
    appStore.setState({
      game: {
        ...state,
        attempts: newAttempts,
        guesses,
        isComplete: true,
        isCorrect: true,
        elapsedTime,
        score: scoreBreakdown.totalScore,
      },
    });

    // Show success
    showSuccess(container, puzzle, scoreBreakdown, elapsedTime);

    // Update stats on server
    updateServerStats(true, newAttempts, elapsedTime);

    // Update local stats
    if (window.electronAPI) {
      window.electronAPI.stats.update({
        completedToday: true,
        points: (stats?.points || 0) + scoreBreakdown.totalScore,
      });
    }
  } else if (newAttempts >= MAX_ATTEMPTS) {
    // Game over - failed
    appStore.setState({
      game: {
        ...state,
        attempts: newAttempts,
        guesses,
        isComplete: true,
        isCorrect: false,
      },
    });

    // Show failure
    showFailure(container, puzzle);

    // Update stats on server
    updateServerStats(false, newAttempts, 0);
  } else {
    // Wrong answer but still have attempts
    appStore.setState({
      game: {
        ...state,
        attempts: newAttempts,
        guesses,
      },
    });

    // Shake input
    const input = container.querySelector('#answer-input');
    input?.classList.add('shake');
    setTimeout(() => input?.classList.remove('shake'), 500);

    // Show hint after first wrong answer
    if (newAttempts === 1 && puzzle.hints && puzzle.hints.length > 0) {
      showHint(container, puzzle);
    }
  }
}

function addGuessToHistory(container: HTMLElement, guess: string, isCorrect: boolean): void {
  const history = container.querySelector('#guess-history');
  if (!history) return;

  const guessEl = document.createElement('div');
  guessEl.className = `guess-item ${isCorrect ? 'correct' : 'incorrect'} bounce-in`;
  guessEl.innerHTML = `
    <span class="guess-text">${guess}</span>
    <span class="guess-icon">${isCorrect ? '✓' : '✗'}</span>
  `;

  history.appendChild(guessEl);
}

function showHint(container: HTMLElement, puzzle: Puzzle): void {
  const state = appStore.get('game');
  const hints = puzzle.hints || [];

  if (hints.length === 0 || state.hintsUsed >= hints.length) return;

  const hintIndex = state.hintsUsed;
  const hint = hints[hintIndex];

  // Update state
  appStore.setState({
    game: {
      ...state,
      hintsUsed: hintIndex + 1,
    },
  });

  // Show hint toast
  window.showToast(`Hint: ${hint}`, 'info', 5000);

  // Update hint button
  const hintBtn = container.querySelector('#hint-btn') as HTMLButtonElement | null;
  if (hintBtn) {
    if (hintIndex + 1 >= hints.length) {
      hintBtn.disabled = true;
      hintBtn.textContent = 'No more hints';
    } else {
      hintBtn.textContent = `Hint ${hintIndex + 2}/${hints.length}`;
    }
  }
}

function showSuccess(
  container: HTMLElement,
  puzzle: Puzzle,
  score: ScoreBreakdown,
  elapsedTime: number
): void {
  // Disable input
  const form = container.querySelector('#answer-form');
  if (form) {
    form.innerHTML = `
      <div class="success-message bounce-in">
        <div class="success-icon">🎉</div>
        <h2>Correct!</h2>
        <p>The answer was: <strong>${puzzle.answer}</strong></p>
      </div>
    `;
  }

  // Show score breakdown
  const scoreHtml = `
    <div class="score-breakdown card bounce-in" style="margin-top: var(--spacing-lg);">
      <h3>Score Breakdown</h3>
      <div class="score-items">
        <div class="score-item">
          <span>Base Score</span>
          <span>+${score.baseScore}</span>
        </div>
        <div class="score-item">
          <span>Speed Bonus</span>
          <span>+${score.speedBonus}</span>
        </div>
        ${score.accuracyPenalty > 0 ? `
          <div class="score-item penalty">
            <span>Wrong Attempts</span>
            <span>-${score.accuracyPenalty}</span>
          </div>
        ` : ''}
        ${score.streakBonus > 0 ? `
          <div class="score-item">
            <span>Streak Bonus</span>
            <span>+${score.streakBonus}</span>
          </div>
        ` : ''}
        ${score.difficultyBonus > 0 ? `
          <div class="score-item">
            <span>Difficulty Bonus</span>
            <span>+${score.difficultyBonus}</span>
          </div>
        ` : ''}
        <div class="divider"></div>
        <div class="score-item total">
          <span>Total</span>
          <span>${score.totalScore}</span>
        </div>
      </div>
      <p class="time-display">Time: ${formatTime(elapsedTime)}</p>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', scoreHtml);

  // Show notification
  if (window.electronAPI) {
    window.electronAPI.notification.show({
      id: `puzzle-complete-${Date.now()}`,
      title: 'Puzzle Complete!',
      body: `You scored ${score.totalScore} points!`,
    });
  }
}

function showFailure(container: HTMLElement, puzzle: Puzzle): void {
  // Disable input
  const form = container.querySelector('#answer-form');
  if (form) {
    form.innerHTML = `
      <div class="failure-message bounce-in">
        <div class="failure-icon">😔</div>
        <h2>Out of attempts!</h2>
        <p>The answer was: <strong>${puzzle.answer}</strong></p>
        ${puzzle.explanation ? `<p class="explanation">${puzzle.explanation}</p>` : ''}
      </div>
    `;
  }
}

async function updateServerStats(
  won: boolean,
  attempts: number,
  timeSpent: number
): Promise<void> {
  try {
    await api.updateStats({
      won,
      attempts,
      timeSpent,
    });
  } catch (error) {
    console.error('Failed to update stats:', error);
    // Queue for offline sync
    // TODO: Implement offline queue
  }
}

function startTimer(container: HTMLElement): void {
  const timerEl = container.querySelector('#game-timer');
  if (!timerEl) return;

  const startTime = appStore.get('game').startTime || Date.now();

  const updateTimer = () => {
    const gameState = appStore.get('game');
    const currentPage = appStore.get('currentPage');
    if (gameState.isComplete || currentPage !== '/') return;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = formatTime(elapsed);

    requestAnimationFrame(updateTimer);
  };

  requestAnimationFrame(updateTimer);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderError(container: HTMLElement, message: string): void {
  container.innerHTML = `
    <div class="error-page">
      <h2>Oops!</h2>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="window.location.reload()">
        Retry
      </button>
    </div>
  `;
}

// Add game-specific styles
const gameStyles = document.createElement('style');
gameStyles.textContent = `
  .game-page {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    max-width: 500px;
    margin: 0 auto;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .game-info {
    display: flex;
    gap: var(--spacing-xs);
  }

  .timer {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: hsl(var(--muted-foreground));
  }

  .puzzle-emoji {
    font-size: 3rem;
  }

  .guess-history {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .guess-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  .guess-item.correct {
    border-color: hsl(var(--success));
    background: hsl(var(--success) / 0.1);
  }

  .guess-item.incorrect {
    border-color: hsl(var(--destructive));
    background: hsl(var(--destructive) / 0.1);
  }

  .guess-icon {
    font-size: var(--font-size-lg);
  }

  .guess-item.correct .guess-icon {
    color: hsl(var(--success));
  }

  .guess-item.incorrect .guess-icon {
    color: hsl(var(--destructive));
  }

  .hint-container {
    text-align: center;
  }

  .success-message,
  .failure-message {
    text-align: center;
    padding: var(--spacing-lg);
  }

  .success-icon,
  .failure-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
  }

  .score-breakdown {
    text-align: left;
  }

  .score-breakdown h3 {
    margin-bottom: var(--spacing-md);
    text-align: center;
  }

  .score-items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .score-item {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .score-item.penalty span:last-child {
    color: hsl(var(--destructive));
  }

  .score-item.total {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-lg);
  }

  .time-display {
    text-align: center;
    margin-top: var(--spacing-md);
    color: hsl(var(--muted-foreground));
  }

  .explanation {
    font-size: var(--font-size-sm);
    color: hsl(var(--muted-foreground));
    margin-top: var(--spacing-md);
  }
`;
document.head.appendChild(gameStyles);
