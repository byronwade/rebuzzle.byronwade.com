/**
 * Game History Page
 * Shows past puzzle attempts and performance over time
 */

import { api } from '../lib/api';
import { appStore } from '../lib/store';

interface GameHistoryItem {
  id: string;
  puzzleId: string;
  puzzle: string;
  answer: string;
  attemptedAnswer: string;
  isCorrect: boolean;
  attempts: number;
  maxAttempts: number;
  timeSpentSeconds: number;
  score: number;
  hintsUsed: number;
  playedAt: string;
}

export async function createHistoryPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page history-page';

  // Check authentication
  const { isAuthenticated } = appStore.getState();

  if (!isAuthenticated) {
    page.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Game History</h1>
        <p class="page-subtitle">View your past puzzle attempts</p>
      </div>
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Sign in to see your history</h3>
        <p>Your game history will appear here once you're logged in.</p>
        <button class="btn btn-primary" onclick="window.location.hash='#/login'">Sign In</button>
      </div>
    `;
    return page;
  }

  // Loading state
  page.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading game history...</p>
    </div>
  `;

  try {
    // Fetch game history from API
    const history = await fetchGameHistory();
    renderHistory(page, history);
  } catch (error) {
    console.error('Failed to load history:', error);
    renderEmptyHistory(page);
  }

  return page;
}

async function fetchGameHistory(): Promise<GameHistoryItem[]> {
  // Try to fetch from offline attempts first
  const offlineAttempts = appStore.get('offlineAttempts') || [];

  // For now, return offline attempts as a placeholder
  // In a real implementation, this would fetch from an API
  return offlineAttempts.map((attempt, index) => ({
    id: `offline-${index}`,
    puzzleId: attempt.puzzleId,
    puzzle: 'Puzzle',
    answer: 'Unknown',
    attemptedAnswer: 'Unknown',
    isCorrect: attempt.score > 0,
    attempts: 1,
    maxAttempts: 3,
    timeSpentSeconds: 0,
    score: attempt.score,
    hintsUsed: 0,
    playedAt: new Date(attempt.timestamp).toISOString(),
  }));
}

function renderHistory(container: HTMLElement, history: GameHistoryItem[]): void {
  const stats = calculateStats(history);

  container.innerHTML = `
    ${getStyles()}
    <div class="page-header">
      <h1 class="page-title">Game History</h1>
      <p class="page-subtitle">Your puzzle-solving journey</p>
    </div>

    <!-- Stats Overview -->
    <div class="history-stats">
      <div class="stat-card">
        <div class="stat-value">${stats.totalGames}</div>
        <div class="stat-label">Games Played</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.winRate}%</div>
        <div class="stat-label">Win Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.avgScore}</div>
        <div class="stat-label">Avg Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatTime(stats.avgTime)}</div>
        <div class="stat-label">Avg Time</div>
      </div>
    </div>

    <!-- History List -->
    <div class="history-section">
      <h2 class="section-title">Recent Games</h2>
      ${history.length > 0 ? `
        <div class="history-list">
          ${history.slice(0, 20).map(item => renderHistoryItem(item)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <h3>No games yet</h3>
          <p>Start playing to see your game history here!</p>
          <button class="btn btn-primary" onclick="window.location.hash='#/'">Play Now</button>
        </div>
      `}
    </div>

    <!-- Export Section -->
    <div class="history-section">
      <h2 class="section-title">Export Data</h2>
      <div class="export-card">
        <p>Download your game history and statistics</p>
        <div class="export-buttons">
          <button class="btn btn-outline" id="export-csv-btn">
            <span>📄</span> Export CSV
          </button>
          <button class="btn btn-outline" id="export-json-btn">
            <span>📋</span> Export JSON
          </button>
        </div>
      </div>
    </div>
  `;

  // Set up export handlers
  setupExportHandlers(container, history);
}

function renderEmptyHistory(container: HTMLElement): void {
  container.innerHTML = `
    ${getStyles()}
    <div class="page-header">
      <h1 class="page-title">Game History</h1>
      <p class="page-subtitle">Your puzzle-solving journey</p>
    </div>
    <div class="empty-state">
      <div class="empty-icon">🎮</div>
      <h3>No games yet</h3>
      <p>Complete puzzles to build your history!</p>
      <button class="btn btn-primary" onclick="window.location.hash='#/'">Play Now</button>
    </div>
  `;
}

function renderHistoryItem(item: GameHistoryItem): string {
  const date = new Date(item.playedAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `
    <div class="history-item ${item.isCorrect ? 'correct' : 'incorrect'}">
      <div class="history-item-status">
        ${item.isCorrect ? '✅' : '❌'}
      </div>
      <div class="history-item-info">
        <span class="history-item-date">${dateStr} at ${timeStr}</span>
        <span class="history-item-details">
          ${item.attempts}/${item.maxAttempts} attempts · ${formatTime(item.timeSpentSeconds)}
          ${item.hintsUsed > 0 ? ` · ${item.hintsUsed} hints` : ''}
        </span>
      </div>
      <div class="history-item-score">
        ${item.isCorrect ? `+${item.score}` : '0'}
      </div>
    </div>
  `;
}

function calculateStats(history: GameHistoryItem[]): {
  totalGames: number;
  winRate: number;
  avgScore: number;
  avgTime: number;
} {
  if (history.length === 0) {
    return { totalGames: 0, winRate: 0, avgScore: 0, avgTime: 0 };
  }

  const wins = history.filter(h => h.isCorrect).length;
  const totalScore = history.reduce((sum, h) => sum + h.score, 0);
  const totalTime = history.reduce((sum, h) => sum + h.timeSpentSeconds, 0);

  return {
    totalGames: history.length,
    winRate: Math.round((wins / history.length) * 100),
    avgScore: Math.round(totalScore / history.length),
    avgTime: Math.round(totalTime / history.length),
  };
}

function formatTime(seconds: number): string {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function setupExportHandlers(container: HTMLElement, history: GameHistoryItem[]): void {
  const csvBtn = container.querySelector('#export-csv-btn');
  const jsonBtn = container.querySelector('#export-json-btn');

  csvBtn?.addEventListener('click', () => {
    exportAsCSV(history);
  });

  jsonBtn?.addEventListener('click', () => {
    exportAsJSON(history);
  });
}

function exportAsCSV(history: GameHistoryItem[]): void {
  const headers = ['Date', 'Result', 'Score', 'Attempts', 'Time (s)', 'Hints Used'];
  const rows = history.map(h => [
    new Date(h.playedAt).toISOString(),
    h.isCorrect ? 'Won' : 'Lost',
    h.score,
    `${h.attempts}/${h.maxAttempts}`,
    h.timeSpentSeconds,
    h.hintsUsed,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csv, 'rebuzzle-history.csv', 'text/csv');
  window.showToast('History exported as CSV', 'success');
}

function exportAsJSON(history: GameHistoryItem[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    totalGames: history.length,
    games: history,
  };

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, 'rebuzzle-history.json', 'application/json');
  window.showToast('History exported as JSON', 'success');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getStyles(): string {
  return `
    <style>
      .history-page {
        max-width: 700px;
        margin: 0 auto;
      }

      .history-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-xl);
      }

      .history-stats .stat-card {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        text-align: center;
      }

      .history-stats .stat-value {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: hsl(var(--foreground));
      }

      .history-stats .stat-label {
        font-size: var(--font-size-xs);
        color: hsl(var(--muted-foreground));
        margin-top: var(--spacing-xs);
      }

      .history-section {
        margin-bottom: var(--spacing-xl);
      }

      .section-title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: hsl(var(--muted-foreground));
        margin-bottom: var(--spacing-md);
      }

      .history-list {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-lg);
        overflow: hidden;
      }

      .history-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        border-bottom: 1px solid hsl(var(--border));
      }

      .history-item:last-child {
        border-bottom: none;
      }

      .history-item-status {
        font-size: 1.25rem;
      }

      .history-item-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .history-item-date {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .history-item-details {
        font-size: var(--font-size-xs);
        color: hsl(var(--muted-foreground));
      }

      .history-item-score {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-bold);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
      }

      .history-item.correct .history-item-score {
        background: hsl(142 76% 36% / 0.1);
        color: hsl(142 76% 36%);
      }

      .history-item.incorrect .history-item-score {
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
      }

      .export-card {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        text-align: center;
      }

      .export-card p {
        color: hsl(var(--muted-foreground));
        margin-bottom: var(--spacing-md);
      }

      .export-buttons {
        display: flex;
        gap: var(--spacing-sm);
        justify-content: center;
      }

      .export-buttons .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
      }

      .empty-state {
        text-align: center;
        padding: var(--spacing-2xl);
        color: hsl(var(--muted-foreground));
      }

      .empty-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-md);
      }

      .empty-state h3 {
        color: hsl(var(--foreground));
        margin-bottom: var(--spacing-sm);
      }

      .empty-state p {
        margin-bottom: var(--spacing-lg);
      }

      @media (max-width: 500px) {
        .history-stats {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    </style>
  `;
}
