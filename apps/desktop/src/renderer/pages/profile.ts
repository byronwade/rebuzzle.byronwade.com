/**
 * Profile Page
 * User stats and achievements
 */

import { api } from '../lib/api';
import { appStore, type UserStats } from '../lib/store';
import { calculateLevel, pointsToNextLevel } from '@rebuzzle/game-logic';
import { router } from '../lib/router';

export async function createProfilePage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page profile-page';

  const { isAuthenticated, user } = appStore.getState();

  if (!isAuthenticated || !user) {
    // Redirect to login
    router.navigate('/login');
    return page;
  }

  page.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading profile...</p>
    </div>
  `;

  try {
    const stats = await api.getUserStats(user.id);
    renderProfile(page, user, stats);
  } catch (error) {
    console.error('Failed to load profile:', error);
    page.innerHTML = `
      <div class="error-page">
        <h2>Failed to load profile</h2>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  return page;
}

function renderProfile(
  container: HTMLElement,
  user: { id: string; username: string; email: string },
  stats: UserStats | null
): void {
  const levelInfo = stats ? pointsToNextLevel(stats.points) : null;

  container.innerHTML = `
    <div class="profile-header">
      <div class="avatar avatar-lg">
        ${user.username.slice(0, 2).toUpperCase()}
      </div>
      <div class="profile-info">
        <h1 class="profile-name">${user.username}</h1>
        <p class="profile-email">${user.email}</p>
      </div>
    </div>

    ${stats ? `
      <div class="level-card card">
        <div class="level-info">
          <span class="level-badge">Level ${stats.level}</span>
          ${levelInfo ? `
            <span class="level-progress-text">
              ${levelInfo.pointsInCurrentLevel} / ${levelInfo.pointsNeeded + levelInfo.pointsInCurrentLevel} XP
            </span>
          ` : ''}
        </div>
        ${levelInfo ? `
          <div class="progress">
            <div class="progress-bar" style="width: ${(levelInfo.pointsInCurrentLevel / (levelInfo.pointsNeeded + levelInfo.pointsInCurrentLevel)) * 100}%"></div>
          </div>
        ` : ''}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${stats.points.toLocaleString()}</div>
          <div class="stat-label">Total Points</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">${stats.wins}</div>
          <div class="stat-label">Puzzles Solved</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${stats.streak}</div>
          <div class="stat-label">Current Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-value">${stats.maxStreak}</div>
          <div class="stat-label">Best Streak</div>
        </div>
      </div>

      <div class="card">
        <h3>Performance</h3>
        <div class="performance-stats">
          <div class="perf-item">
            <span class="perf-label">Perfect Solves</span>
            <span class="perf-value">${stats.perfectSolves}</span>
          </div>
          ${stats.fastestSolveSeconds ? `
            <div class="perf-item">
              <span class="perf-label">Fastest Solve</span>
              <span class="perf-value">${formatTime(stats.fastestSolveSeconds)}</span>
            </div>
          ` : ''}
          <div class="perf-item">
            <span class="perf-label">Total Games</span>
            <span class="perf-value">${stats.totalGames}</span>
          </div>
          ${stats.totalGames > 0 ? `
            <div class="perf-item">
              <span class="perf-label">Win Rate</span>
              <span class="perf-value">${Math.round((stats.wins / stats.totalGames) * 100)}%</span>
            </div>
          ` : ''}
        </div>
      </div>
    ` : `
      <div class="card">
        <p>No stats available yet. Play some puzzles to see your progress!</p>
      </div>
    `}

    <button class="btn btn-outline logout-btn" id="logout-btn">
      Sign Out
    </button>
  `;

  // Set up logout
  const logoutBtn = container.querySelector('#logout-btn');
  logoutBtn?.addEventListener('click', async () => {
    await api.logout();
    router.navigate('/login');
  });
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Add profile-specific styles
const profileStyles = document.createElement('style');
profileStyles.textContent = `
  .profile-page {
    max-width: 500px;
    margin: 0 auto;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }

  .profile-info {
    flex: 1;
  }

  .profile-name {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    margin: 0;
  }

  .profile-email {
    color: hsl(var(--muted-foreground));
    margin: 0;
  }

  .level-card {
    margin-bottom: var(--spacing-lg);
  }

  .level-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .level-badge {
    font-weight: var(--font-weight-bold);
    color: hsl(var(--primary));
  }

  .level-progress-text {
    font-size: var(--font-size-sm);
    color: hsl(var(--muted-foreground));
  }

  .stats-grid {
    margin-bottom: var(--spacing-lg);
  }

  .stat-icon {
    font-size: 1.5rem;
    margin-bottom: var(--spacing-xs);
  }

  .performance-stats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
  }

  .perf-item {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .perf-label {
    color: hsl(var(--muted-foreground));
  }

  .perf-value {
    font-weight: var(--font-weight-medium);
  }

  .logout-btn {
    width: 100%;
    margin-top: var(--spacing-xl);
  }
`;
document.head.appendChild(profileStyles);
