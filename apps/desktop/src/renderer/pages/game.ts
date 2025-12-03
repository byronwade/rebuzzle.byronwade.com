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
import { showCelebration } from '../lib/celebration';
import { shareResults } from '../lib/share';

// Game constants
const MAX_ATTEMPTS = 3;
const API_BASE = 'https://rebuzzle.byronwade.com';

// Convert difficulty number to text name (matching web)
function getDifficultyName(difficulty: number): string {
  const names: Record<number, string> = {
    1: 'Easy',
    2: 'Medium',
    3: 'Moderate',
    4: 'Hard',
    5: 'Difficult',
    6: 'Evil',
    7: 'Impossible',
  };
  return names[difficulty] || 'Unknown';
}

// Helper functions for web app parity
function getPersonalizedGreeting(
  streak: number,
  wins: number
): { icon: string; message: string; subtext: string } {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (streak >= 7)
    return {
      icon: '🔥',
      message: `${timeGreeting}! Day ${streak} of your streak`,
      subtext: 'Keep it going!',
    };
  if (streak >= 3)
    return {
      icon: '🔥',
      message: `${timeGreeting}! ${streak}-day streak`,
      subtext: "You're on fire!",
    };
  if (streak === 1)
    return {
      icon: '✨',
      message: `${timeGreeting}! Streak started`,
      subtext: 'Come back tomorrow to keep it going',
    };
  if (wins > 0)
    return { icon: '✨', message: `${timeGreeting}! Welcome back`, subtext: 'Fresh puzzle awaits' };
  return { icon: '✨', message: `${timeGreeting}!`, subtext: "Ready for today's puzzle?" };
}

function getPuzzleQuestion(puzzleType: string): string {
  const questions: Record<string, string> = {
    rebus: 'What does this rebus puzzle represent?',
    riddle: 'What is the answer to this riddle?',
    trivia: 'What is the answer to this trivia question?',
    'word-puzzle': 'What is the answer to this word puzzle?',
    'logic-grid': 'Use deductive reasoning to solve this logic grid puzzle',
    'number-sequence': 'What comes next in this number sequence?',
    'caesar-cipher': 'Decode this encrypted message',
    'word-ladder': 'Transform the start word into the end word',
    'pattern-recognition': 'What pattern comes next?',
    'cryptic-crossword': 'Solve this cryptic crossword clue',
  };
  return questions[puzzleType] || 'What is the answer to this puzzle?';
}

async function fetchSolveCount(puzzleId: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/api/puzzles/stats?puzzleId=${puzzleId}`);
    if (response.ok) {
      const data = await response.json();
      return data.todaySolves || 0;
    }
  } catch (e) {
    /* ignore */
  }
  return 0;
}

function renderHintCard(
  hints: string[],
  hintsUsed: number,
  isComplete: boolean
): string {
  if (!hints || hints.length === 0) return '';

  const revealedHints = hints.slice(0, hintsUsed);
  const hintsRemaining = hints.length - hintsUsed;

  return `
    <div class="hint-card" id="hint-card">
      <div class="hint-card-header">
        <div class="hint-card-title">
          <span class="hint-icon">💡</span>
          <span>Hints</span>
        </div>
        <span class="hint-count">${hintsUsed}/${hints.length}</span>
      </div>
      <div class="hint-list" id="hint-list">
        ${revealedHints.length > 0
          ? revealedHints
              .map(
                (hint, i) => `
            <div class="hint-item">
              <span class="hint-number">${i + 1}.</span>
              <span>${hint}</span>
            </div>
          `
              )
              .join('')
          : '<p class="hint-empty">No hints revealed yet</p>'
        }
      </div>
      ${!isComplete && hintsRemaining > 0
        ? `<button class="btn btn-hint" id="hint-btn">
            <span class="hint-icon">💡</span>
            Get Hint (${hintsRemaining} remaining) · -10 pts
          </button>`
        : hintsRemaining === 0 && hintsUsed > 0
          ? '<p class="hint-exhausted">No more hints available</p>'
          : ''
      }
    </div>
  `;
}

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
  const stats = appStore.get('stats');

  // Get personalized greeting based on user stats
  const greeting = getPersonalizedGreeting(stats?.streak || 0, stats?.wins || 0);

  container.innerHTML = `
    <div class="game-layout">
      <!-- Puzzle Area - takes up available space, vertically centered -->
      <main class="puzzle-area">
        <div class="puzzle-content">
          <!-- Game info badges and attempts -->
          <div class="game-header">
            <div class="game-info">
              <span class="badge badge-difficulty">${getDifficultyName(typeof puzzle.difficulty === 'number' ? puzzle.difficulty : 5)}</span>
            </div>
            <div class="attempts-indicator" id="attempts-indicator">
              ${renderAttempts(0, MAX_ATTEMPTS)}
            </div>
          </div>

          <!-- Personalized greeting -->
          <div class="greeting">
            <span class="greeting-icon">${greeting.icon}</span>
            <span class="greeting-text">
              <span class="greeting-message">${greeting.message}</span>
              <span class="greeting-subtext"> · ${greeting.subtext}</span>
            </span>
          </div>

          <!-- Puzzle display section -->
          <section class="puzzle-section">
            <div class="puzzle-container">
              <div class="puzzle-display" id="puzzle-display">${formatPuzzle(puzzle.puzzle)}</div>
            </div>
            <p class="puzzle-question">${getPuzzleQuestion(puzzle.puzzleType || 'rebus')}</p>
            <div class="solve-counter" id="solve-counter"></div>
          </section>

          <!-- Guess history -->
          <div class="guess-history" id="guess-history"></div>

          <!-- Hint card -->
          <div class="hint-container" id="hint-container">
            ${renderHintCard(puzzle.hints || [], state.hintsUsed, state.isComplete)}
          </div>
        </div>
      </main>

      <!-- Input Area - pinned to bottom -->
      <section class="input-area">
        <div class="input-area-content">
          <form class="answer-input-container" id="answer-form">
            <div class="input-wrapper" id="input-wrapper">
              <input
                type="text"
                class="input answer-input"
                id="answer-input"
                placeholder="Type your answer..."
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
              />
              <button type="submit" class="btn btn-primary submit-btn" id="submit-btn">
                Submit
              </button>
            </div>
            <p class="input-hint">Words turn <span class="text-success">green</span> when correct</p>
          </form>
        </div>
      </section>
    </div>
  `;

  // Set up event listeners
  setupGameListeners(container, puzzle);

  // Fetch and display solve count
  if (puzzle.id) {
    fetchSolveCount(puzzle.id).then((count) => {
      const solveCounterEl = container.querySelector('#solve-counter');
      if (solveCounterEl && count > 0) {
        solveCounterEl.innerHTML = `
          <span class="solve-icon">👥</span>
          <span>${count.toLocaleString()} ${count === 1 ? 'player' : 'players'} solved today</span>
        `;
      }
    });
  }
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
  const remaining = max - used;
  const filledHeart = `<svg class="heart-icon filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
  const emptyHeart = `<svg class="heart-icon empty" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

  let hearts = '';
  for (let i = 0; i < max; i++) {
    hearts += i < remaining ? filledHeart : emptyHeart;
  }
  return `${hearts}<span class="attempts-count">${remaining}/${max}</span>`;
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

  // Update attempts display (now in header)
  const attemptsIndicator = container.querySelector('#attempts-indicator');
  if (attemptsIndicator) {
    attemptsIndicator.innerHTML = renderAttempts(newAttempts, MAX_ATTEMPTS);
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
      hintsUsed: state.hintsUsed,
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

    // Record attempt to server (consistent with mobile/web)
    const gameState = appStore.get('game');
    recordPuzzleAttempt(puzzle, answer, true, newAttempts, elapsedTime, gameState.hintsUsed);

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

    // Record attempt to server (consistent with mobile/web)
    const elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
    recordPuzzleAttempt(puzzle, answer, false, newAttempts, elapsedTime, state.hintsUsed);
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

  // Re-render the hint card with updated state
  const hintContainer = container.querySelector('#hint-container');
  if (hintContainer) {
    hintContainer.innerHTML = renderHintCard(hints, hintIndex + 1, state.isComplete);

    // Re-attach hint button listener
    const newHintBtn = hintContainer.querySelector('#hint-btn') as HTMLButtonElement | null;
    if (newHintBtn) {
      newHintBtn.addEventListener('click', () => {
        showHint(container, puzzle);
      });
    }
  }
}

function showSuccess(
  container: HTMLElement,
  puzzle: Puzzle,
  score: ScoreBreakdown,
  elapsedTime: number
): void {
  const stats = appStore.get('stats');
  const gameState = appStore.get('game');

  // Show celebration overlay with confetti
  showCelebration({
    score: score.totalScore,
    streak: stats?.streak || 0,
    attempts: gameState.attempts,
    maxAttempts: MAX_ATTEMPTS,
    timeTaken: elapsedTime,
  });

  // Disable input and show success message
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

  // Show score breakdown with share button
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
        ${score.hintPenalty > 0 ? `
          <div class="score-item penalty">
            <span>Hints Used</span>
            <span>-${score.hintPenalty}</span>
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

      <div class="share-container" style="margin-top: var(--spacing-lg); text-align: center;">
        <button class="btn btn-primary" id="share-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          Share Results
        </button>
      </div>
    </div>

    <div class="countdown-container" id="next-puzzle-countdown"></div>
  `;

  container.insertAdjacentHTML('beforeend', scoreHtml);

  // Set up share button
  const shareBtn = container.querySelector('#share-btn');
  shareBtn?.addEventListener('click', () => {
    shareResults({
      success: true,
      attempts: gameState.attempts,
      maxAttempts: MAX_ATTEMPTS,
      streak: stats?.streak || 0,
    });
  });

  // Start countdown to next puzzle
  startNextPuzzleCountdown(container);

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

async function recordPuzzleAttempt(
  puzzle: Puzzle,
  answer: string,
  isCorrect: boolean,
  attempts: number,
  timeSpentSeconds: number,
  hintsUsed: number
): Promise<void> {
  try {
    // Record the attempt to the API (same as mobile/web)
    const result = await api.recordAttempt({
      puzzleId: puzzle.id,
      attemptedAnswer: answer,
      isCorrect,
      abandoned: !isCorrect && attempts >= MAX_ATTEMPTS,
      attemptNumber: attempts,
      maxAttempts: MAX_ATTEMPTS,
      timeSpentSeconds,
      difficulty: typeof puzzle.difficulty === 'string' ? puzzle.difficulty : undefined,
      hintsUsed,
    });

    if (!result.success) {
      console.error('Failed to record attempt');
      // Queue for offline sync
      const state = appStore.get('offlineAttempts');
      appStore.setState({
        offlineAttempts: [
          ...state,
          {
            puzzleId: puzzle.id,
            timestamp: Date.now(),
            score: isCorrect ? appStore.get('game').score || 0 : 0,
            synced: false,
          },
        ],
      });
    }
  } catch (error) {
    console.error('Failed to record attempt:', error);
    // Queue for offline sync
    const state = appStore.get('offlineAttempts');
    appStore.setState({
      offlineAttempts: [
        ...state,
        {
          puzzleId: puzzle.id,
          timestamp: Date.now(),
          score: isCorrect ? appStore.get('game').score || 0 : 0,
          synced: false,
        },
      ],
    });
  }
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

function startNextPuzzleCountdown(container: HTMLElement): void {
  const countdownEl = container.querySelector('#next-puzzle-countdown');
  if (!countdownEl) return;

  const updateCountdown = () => {
    const { nextPuzzleTime, serverTimeOffset } = appStore.getState();
    const currentPage = appStore.get('currentPage');

    // Stop if page changed
    if (currentPage !== '/') return;

    if (!nextPuzzleTime) {
      countdownEl.innerHTML = '';
      return;
    }

    // Use server-adjusted time to prevent clock manipulation
    const serverNow = Date.now() + serverTimeOffset;
    const targetTime = new Date(nextPuzzleTime).getTime();
    const remaining = targetTime - serverNow;

    if (remaining <= 0) {
      countdownEl.innerHTML = `
        <div class="countdown-ready">
          <p>New puzzle available!</p>
          <button class="btn btn-primary" onclick="location.reload()">Play Now</button>
        </div>
      `;
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    countdownEl.innerHTML = `
      <p class="countdown-label">Next puzzle in</p>
      <p class="countdown-time">${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</p>
    `;

    requestAnimationFrame(updateCountdown);
  };

  updateCountdown();
}

// Add game-specific styles
const gameStyles = document.createElement('style');
gameStyles.textContent = `
  .game-page {
    height: 100%;
    padding: 0;
    overflow: hidden;
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

  .countdown-container {
    text-align: center;
    padding: var(--spacing-lg);
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-lg);
    margin-top: var(--spacing-lg);
  }

  .countdown-label {
    font-size: var(--font-size-sm);
    color: hsl(var(--muted-foreground));
    margin-bottom: var(--spacing-xs);
  }

  .countdown-time {
    font-family: var(--font-mono);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: hsl(var(--foreground));
  }

  .countdown-ready {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .countdown-ready p {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: hsl(var(--success));
  }
`;
document.head.appendChild(gameStyles);
