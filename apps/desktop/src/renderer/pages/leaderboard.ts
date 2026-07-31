/**
 * Leaderboard Page
 * Display rankings with time filters
 */

import { api } from '../lib/api';
import { appStore } from '../lib/store';

type TimeFrame = 'today' | 'week' | 'month' | 'allTime';

interface LeaderboardEntry {
  rank: number;
  user: { id: string; username: string };
  stats: { points: number; streak: number; wins: number; level: number };
}

export async function createLeaderboardPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page leaderboard-page';

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Leaderboard</h1>
    </div>

    <div class="tabs" id="timeframe-tabs">
      <button class="tab active" data-timeframe="allTime">All Time</button>
      <button class="tab" data-timeframe="month">Month</button>
      <button class="tab" data-timeframe="week">Week</button>
      <button class="tab" data-timeframe="today">Today</button>
    </div>

    <div class="leaderboard-container" id="leaderboard-list">
      <div class="loading-container">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;

  // Set up tabs
  const tabs = page.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const timeframe = tab.getAttribute('data-timeframe') as TimeFrame;
      loadLeaderboard(page, timeframe);
    });
  });

  // Load initial data
  await loadLeaderboard(page, 'allTime');

  return page;
}

async function loadLeaderboard(container: HTMLElement, timeframe: TimeFrame): Promise<void> {
  const listContainer = container.querySelector('#leaderboard-list');
  if (!listContainer) return;

  // Show loading
  listContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
    </div>
  `;

  try {
    const leaderboard = await api.getLeaderboard({ limit: 50, timeframe });
    renderLeaderboard(listContainer as HTMLElement, leaderboard);
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    listContainer.innerHTML = `
      <div class="error-message">
        <p>Failed to load leaderboard</p>
        <button class="btn btn-primary btn-sm" onclick="this.closest('.leaderboard-page').querySelector('.tab.active').click()">
          Retry
        </button>
      </div>
    `;
  }
}

function renderLeaderboard(container: HTMLElement, entries: LeaderboardEntry[]): void {
  const currentUser = appStore.get('user');

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No entries yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="list">
      ${entries.map((entry) => renderEntry(entry, entry.user.id === currentUser?.id)).join('')}
    </div>
  `;
}

function renderEntry(entry: LeaderboardEntry, isCurrentUser: boolean): string {
  const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';

  return `
    <div class="list-item leaderboard-entry ${isCurrentUser ? 'current-user' : ''} ${rankClass}">
      <div class="rank">
        ${entry.rank <= 3 ? getRankMedal(entry.rank) : `#${entry.rank}`}
      </div>
      <div class="avatar avatar-sm">
        ${getInitials(entry.user.username)}
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${entry.user.username}</div>
        <div class="list-item-subtitle">
          Level ${entry.stats.level} • ${entry.stats.wins} wins
        </div>
      </div>
      <div class="entry-stats">
        <div class="stat-points">${entry.stats.points.toLocaleString()}</div>
        <div class="stat-streak">🔥 ${entry.stats.streak}</div>
      </div>
    </div>
  `;
}

function getRankMedal(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `#${rank}`;
  }
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

// Add leaderboard-specific styles
const leaderboardStyles = document.createElement('style');
leaderboardStyles.textContent = `
  .leaderboard-page {
    max-width: 700px;
    margin: 0 auto;
  }

  .leaderboard-container {
    margin-top: var(--spacing-lg);
  }

  .leaderboard-entry {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .leaderboard-entry.current-user {
    background: hsl(var(--primary) / 0.1);
    border-color: hsl(var(--primary));
  }

  .leaderboard-entry .rank {
    width: 40px;
    text-align: center;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-lg);
  }

  .leaderboard-entry.rank-1 .rank,
  .leaderboard-entry.rank-2 .rank,
  .leaderboard-entry.rank-3 .rank {
    font-size: 1.5rem;
  }

  .entry-stats {
    text-align: right;
    min-width: 80px;
  }

  .stat-points {
    font-weight: var(--font-weight-bold);
    color: hsl(var(--foreground));
  }

  .stat-streak {
    font-size: var(--font-size-xs);
    color: hsl(var(--muted-foreground));
  }

  .empty-state,
  .error-message {
    text-align: center;
    padding: var(--spacing-xl);
    color: hsl(var(--muted-foreground));
  }

  .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }
`;
document.head.appendChild(leaderboardStyles);
