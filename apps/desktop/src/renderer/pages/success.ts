/**
 * Success Page
 * Shows detailed results, score breakdown, leaderboard, and share options after puzzle completion
 */

import { api } from '../lib/api';
import { appStore } from '../lib/store';
import { router } from '../lib/router';
import { shareResults } from '../lib/share';
import { startCountdown, renderCountdown, type CountdownState } from '../lib/countdown';

// Cleanup function for countdown
let countdownCleanup: (() => void) | null = null;

const MAX_ATTEMPTS = 3;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export async function createSuccessPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page success-page';

  const result = appStore.get('lastGameResult');
  const stats = appStore.get('stats');

  // If no game result, redirect to home
  if (!result) {
    page.innerHTML = `
      <div class="no-result">
        <p>No recent game found</p>
        <button class="btn btn-primary" id="go-home-btn">Play Today's Puzzle</button>
      </div>
    `;
    setTimeout(() => {
      const btn = page.querySelector('#go-home-btn');
      btn?.addEventListener('click', () => router.navigate('/'));
    }, 0);
    return page;
  }

  const { scoreBreakdown, puzzle, elapsedTime, attempts, hintsUsed } = result;

  // Initial render with loading state for leaderboard
  page.innerHTML = `
    <div class="success-content">
      <div class="success-header">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h1>Puzzle Complete!</h1>
        <p class="success-answer">The answer was: <strong>${puzzle.answer}</strong></p>
      </div>

      <!-- Score Breakdown Card -->
      <div class="score-card card">
        <h3>Score Breakdown</h3>
        <div class="score-items">
          <div class="score-item">
            <span>Base Score</span>
            <span class="score-value positive">+${scoreBreakdown.baseScore}</span>
          </div>
          <div class="score-item">
            <span>Speed Bonus</span>
            <span class="score-value positive">+${scoreBreakdown.speedBonus}</span>
          </div>
          ${scoreBreakdown.accuracyPenalty > 0 ? `
            <div class="score-item">
              <span>Wrong Attempts (${attempts - 1})</span>
              <span class="score-value negative">-${scoreBreakdown.accuracyPenalty}</span>
            </div>
          ` : ''}
          ${scoreBreakdown.hintPenalty > 0 ? `
            <div class="score-item">
              <span>Hints Used (${hintsUsed})</span>
              <span class="score-value negative">-${scoreBreakdown.hintPenalty}</span>
            </div>
          ` : ''}
          ${scoreBreakdown.streakBonus > 0 ? `
            <div class="score-item">
              <span>Streak Bonus</span>
              <span class="score-value positive">+${scoreBreakdown.streakBonus}</span>
            </div>
          ` : ''}
          ${scoreBreakdown.difficultyBonus > 0 ? `
            <div class="score-item">
              <span>Difficulty Bonus</span>
              <span class="score-value positive">+${scoreBreakdown.difficultyBonus}</span>
            </div>
          ` : ''}
          <div class="score-divider"></div>
          <div class="score-item total">
            <span>Total Score</span>
            <span class="score-value">${scoreBreakdown.totalScore}</span>
          </div>
        </div>
        <div class="score-stats">
          <div class="stat-item">
            <span class="stat-label">Time</span>
            <span class="stat-value">${formatTime(elapsedTime)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Attempts</span>
            <span class="stat-value">${attempts}/${MAX_ATTEMPTS}</span>
          </div>
          ${stats?.streak ? `
            <div class="stat-item">
              <span class="stat-label">Streak</span>
              <span class="stat-value">${stats.streak} days</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Today's Leaderboard -->
      <div class="leaderboard-card card">
        <div class="leaderboard-header">
          <h3>Today's Leaderboard</h3>
          <a href="#/leaderboard" class="view-all-link">View All</a>
        </div>
        <div class="leaderboard-content" id="leaderboard-content">
          <div class="loading-spinner-small"></div>
          <p class="loading-text">Loading leaderboard...</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="success-actions">
        <button class="btn btn-primary btn-large" id="share-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          Share Results
        </button>
        <button class="btn btn-secondary btn-large" id="home-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Back Home
        </button>
      </div>

      <!-- Next Puzzle Countdown -->
      <div class="countdown-card-wrapper" id="countdown-card-wrapper"></div>
    </div>
  `;

  // Set up event listeners
  setupEventListeners(page, stats?.streak || 0, attempts);

  // Load leaderboard
  loadLeaderboard(page);

  // Start countdown using shared module
  initSuccessCountdown(page);

  return page;
}

function setupEventListeners(container: HTMLElement, streak: number, attempts: number): void {
  // Share button
  const shareBtn = container.querySelector('#share-btn');
  shareBtn?.addEventListener('click', () => {
    shareResults({
      success: true,
      attempts,
      maxAttempts: MAX_ATTEMPTS,
      streak,
    });
    window.showToast('Results copied to clipboard!', 'success');
  });

  // Home button
  const homeBtn = container.querySelector('#home-btn');
  homeBtn?.addEventListener('click', () => {
    router.navigate('/');
  });

  // View all leaderboard link
  const viewAllLink = container.querySelector('.view-all-link');
  viewAllLink?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/leaderboard');
  });
}

async function loadLeaderboard(container: HTMLElement): Promise<void> {
  const leaderboardContent = container.querySelector('#leaderboard-content');
  if (!leaderboardContent) return;

  try {
    const leaderboard = await api.getLeaderboard({
      limit: 10,
      timeframe: 'today',
      sortBy: 'points',
    });

    if (leaderboard.length === 0) {
      leaderboardContent.innerHTML = `
        <p class="empty-leaderboard">No scores yet today. You're first!</p>
      `;
      return;
    }

    const user = appStore.get('user');
    const userId = user?.id;

    leaderboardContent.innerHTML = `
      <div class="leaderboard-list">
        ${leaderboard.map((entry, index) => {
          const isCurrentUser = entry.user.id === userId;
          const rankIcon = index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `${index + 1}`;
          const rankClass = index < 3 ? `rank-${index + 1}` : '';

          return `
            <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''} ${rankClass}">
              <div class="rank-badge">${rankIcon}</div>
              <div class="player-info">
                <span class="player-name">${entry.user.username}${isCurrentUser ? ' (You)' : ''}</span>
              </div>
              <div class="player-score">${entry.stats.points} pts</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    leaderboardContent.innerHTML = `
      <p class="leaderboard-error">Unable to load leaderboard</p>
    `;
  }
}

function initSuccessCountdown(container: HTMLElement): void {
  const countdownWrapper = container.querySelector('#countdown-card-wrapper') as HTMLElement;
  if (!countdownWrapper) return;

  // Clean up any existing countdown
  if (countdownCleanup) {
    countdownCleanup();
    countdownCleanup = null;
  }

  // Start the countdown using shared module
  countdownCleanup = startCountdown((state: CountdownState) => {
    countdownWrapper.innerHTML = renderCountdown(state);
  });
}

// Add success page styles
const successStyles = document.createElement('style');
successStyles.textContent = `
  .success-page {
    max-width: 700px;
    margin: 0 auto;
    padding: var(--spacing-lg);
  }

  .success-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .success-header {
    text-align: center;
    margin-bottom: var(--spacing-md);
  }

  .success-icon {
    width: 64px;
    height: 64px;
    background: hsl(142 76% 36%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
  }

  .success-icon svg {
    width: 32px;
    height: 32px;
    color: white;
  }

  .success-header h1 {
    font-size: var(--font-size-2xl);
    margin-bottom: var(--spacing-sm);
  }

  .success-answer {
    color: hsl(var(--muted-foreground));
  }

  .success-answer strong {
    color: hsl(var(--foreground));
  }

  .score-card {
    padding: var(--spacing-lg);
  }

  .score-card h3 {
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

  .score-item.total {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .score-value {
    font-family: var(--font-mono);
  }

  .score-value.positive {
    color: hsl(142 76% 36%);
  }

  .score-value.negative {
    color: hsl(var(--destructive));
  }

  .score-divider {
    height: 1px;
    background: hsl(var(--border));
    margin: var(--spacing-sm) 0;
  }

  .score-stats {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xl);
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: 1px solid hsl(var(--border));
  }

  .stat-item {
    text-align: center;
  }

  .stat-label {
    display: block;
    font-size: var(--font-size-xs);
    color: hsl(var(--muted-foreground));
    margin-bottom: var(--spacing-xs);
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .leaderboard-card {
    padding: var(--spacing-lg);
  }

  .leaderboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .leaderboard-header h3 {
    margin: 0;
  }

  .view-all-link {
    font-size: var(--font-size-sm);
    color: hsl(var(--primary));
    text-decoration: none;
  }

  .view-all-link:hover {
    text-decoration: underline;
  }

  .leaderboard-content {
    min-height: 100px;
  }

  .leaderboard-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .leaderboard-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    background: hsl(var(--muted) / 0.3);
  }

  .leaderboard-row.current-user {
    background: hsl(var(--primary) / 0.15);
    border: 1px solid hsl(var(--primary) / 0.3);
  }

  .leaderboard-row.rank-1 .rank-badge {
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
  }

  .leaderboard-row.rank-2 .rank-badge {
    background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
    color: #000;
  }

  .leaderboard-row.rank-3 .rank-badge {
    background: linear-gradient(135deg, #CD7F32, #8B4513);
    color: white;
  }

  .rank-badge {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    background: hsl(var(--muted));
    flex-shrink: 0;
  }

  .player-info {
    flex: 1;
    min-width: 0;
  }

  .player-name {
    font-size: var(--font-size-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .player-score {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: hsl(var(--primary));
  }

  .empty-leaderboard,
  .leaderboard-error {
    text-align: center;
    color: hsl(var(--muted-foreground));
    padding: var(--spacing-lg);
  }

  .loading-spinner-small {
    width: 24px;
    height: 24px;
    border: 2px solid hsl(var(--border));
    border-top-color: hsl(var(--primary));
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-sm);
  }

  .loading-text {
    text-align: center;
    color: hsl(var(--muted-foreground));
    font-size: var(--font-size-sm);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .success-actions {
    display: flex;
    gap: var(--spacing-md);
  }

  .success-actions .btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .btn-large {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-base);
  }

  .countdown-card-wrapper {
    margin-top: var(--spacing-md);
  }

  .no-result {
    text-align: center;
    padding: var(--spacing-2xl);
  }

  .no-result p {
    margin-bottom: var(--spacing-lg);
    color: hsl(var(--muted-foreground));
  }
`;
document.head.appendChild(successStyles);
