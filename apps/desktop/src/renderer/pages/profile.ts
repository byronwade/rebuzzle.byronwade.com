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
      <button class="btn btn-icon" id="edit-profile-btn" title="Edit Profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
        </svg>
      </button>
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
          <div class="stat-value">${stats.maxStreak ?? 0}</div>
          <div class="stat-label">Best Streak</div>
        </div>
      </div>

      <div class="card">
        <h3>Performance</h3>
        <div class="performance-stats">
          <div class="perf-item">
            <span class="perf-label">Perfect Solves</span>
            <span class="perf-value">${stats.perfectSolves ?? 0}</span>
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

    <!-- Edit Profile Modal -->
    <div class="profile-modal-overlay" id="edit-profile-modal">
      <div class="profile-modal">
        <div class="profile-modal-header">
          <h2>Edit Profile</h2>
          <button class="btn btn-icon modal-close-btn" id="close-edit-modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form id="edit-profile-form" class="profile-modal-content">
          <div class="form-group">
            <label for="edit-username">Username</label>
            <input type="text" id="edit-username" class="input" value="${user.username}" minlength="3" maxlength="20" required />
            <p class="form-hint">3-20 characters</p>
          </div>
          <div class="form-group">
            <label for="edit-email">Email</label>
            <input type="email" id="edit-email" class="input" value="${user.email}" disabled />
            <p class="form-hint">Email cannot be changed</p>
          </div>
          <div class="profile-modal-actions">
            <button type="button" class="btn btn-outline" id="cancel-edit-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="save-profile-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Set up logout
  const logoutBtn = container.querySelector('#logout-btn');
  logoutBtn?.addEventListener('click', async () => {
    await api.logout();
    router.navigate('/login');
  });

  // Set up edit profile modal
  setupEditProfileModal(container, user);
}

function setupEditProfileModal(
  container: HTMLElement,
  user: { id: string; username: string; email: string }
): void {
  const modal = container.querySelector('#edit-profile-modal') as HTMLElement;
  const editBtn = container.querySelector('#edit-profile-btn');
  const closeBtn = container.querySelector('#close-edit-modal');
  const cancelBtn = container.querySelector('#cancel-edit-btn');
  const form = container.querySelector('#edit-profile-form') as HTMLFormElement;

  const showModal = () => {
    modal?.classList.add('show');
  };

  const hideModal = () => {
    modal?.classList.remove('show');
  };

  editBtn?.addEventListener('click', showModal);
  closeBtn?.addEventListener('click', hideModal);
  cancelBtn?.addEventListener('click', hideModal);

  // Close on overlay click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('show')) {
      hideModal();
    }
  });

  // Handle form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = container.querySelector('#edit-username') as HTMLInputElement;
    const saveBtn = container.querySelector('#save-profile-btn') as HTMLButtonElement;
    const newUsername = usernameInput.value.trim();

    if (newUsername === user.username) {
      hideModal();
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      window.showToast('Username must be 3-20 characters', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      await api.updateProfile({ username: newUsername });

      // Update store
      const state = appStore.getState();
      if (state.user) {
        appStore.setState({
          user: { ...state.user, username: newUsername }
        });
      }

      // Update UI
      const nameEl = container.querySelector('.profile-name');
      const avatarEl = container.querySelector('.avatar');
      if (nameEl) nameEl.textContent = newUsername;
      if (avatarEl) avatarEl.textContent = newUsername.slice(0, 2).toUpperCase();

      window.showToast('Profile updated successfully!', 'success');
      hideModal();
    } catch (error) {
      console.error('Failed to update profile:', error);
      window.showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
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
    max-width: 700px;
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

  .profile-header {
    position: relative;
  }

  .profile-header .btn-icon {
    position: absolute;
    top: 0;
    right: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(var(--muted));
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    transition: all var(--transition-fast);
  }

  .profile-header .btn-icon:hover {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  /* Edit Profile Modal */
  .profile-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
  }

  .profile-modal-overlay.show {
    opacity: 1;
    visibility: visible;
  }

  .profile-modal {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 400px;
    transform: scale(0.95);
    transition: transform 0.2s ease;
  }

  .profile-modal-overlay.show .profile-modal {
    transform: scale(1);
  }

  .profile-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid hsl(var(--border));
  }

  .profile-modal-header h2 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    margin: 0;
  }

  .modal-close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    transition: all var(--transition-fast);
  }

  .modal-close-btn:hover {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  .profile-modal-content {
    padding: var(--spacing-lg);
  }

  .form-group {
    margin-bottom: var(--spacing-md);
  }

  .form-group label {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-xs);
    color: hsl(var(--foreground));
  }

  .form-group .input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-md);
    color: hsl(var(--foreground));
    transition: border-color var(--transition-fast);
  }

  .form-group .input:focus {
    outline: none;
    border-color: hsl(var(--primary));
  }

  .form-group .input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-hint {
    font-size: var(--font-size-xs);
    color: hsl(var(--muted-foreground));
    margin-top: var(--spacing-xs);
  }

  .profile-modal-actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
    padding-top: var(--spacing-md);
    border-top: 1px solid hsl(var(--border));
    margin-top: var(--spacing-md);
  }
`;
document.head.appendChild(profileStyles);
