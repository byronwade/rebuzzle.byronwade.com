/**
 * Achievements Page
 * Displays unlockable achievements with progress tracking
 */

import { api } from '../lib/api';

interface Achievement {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  order: number;
  secret?: boolean;
  unlocked: boolean;
  unlockedAt?: string;
}

interface AchievementProgress {
  unlocked: number;
  total: number;
  percentage: number;
}

const rarityConfig: Record<string, { label: string; color: string }> = {
  common: { label: 'Common', color: 'slate' },
  uncommon: { label: 'Uncommon', color: 'green' },
  rare: { label: 'Rare', color: 'blue' },
  epic: { label: 'Epic', color: 'purple' },
  legendary: { label: 'Legendary', color: 'amber' },
};

const rarityColors: Record<string, string> = {
  slate: 'hsl(215 20% 65%)',
  green: 'hsl(142 71% 45%)',
  blue: 'hsl(217 91% 60%)',
  purple: 'hsl(262 83% 58%)',
  amber: 'hsl(45 93% 47%)',
};

function getLockIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>`;
}

function getCheckIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-check-svg">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>`;
}

function getAchievementIcon(icon: string): string {
  // Map icon names to SVG icons
  const icons: Record<string, string> = {
    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"></path>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"></path>
      <path d="M4 22h16"></path>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
    </svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,
    flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>`,
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>`,
    zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>`,
    award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <circle cx="12" cy="8" r="6"></circle>
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path>
    </svg>`,
    crown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
    </svg>`,
    gem: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M6 3h12l4 6-10 13L2 9z"></path>
      <path d="M11 3 8 9l4 13 4-13-3-6"></path>
      <path d="M2 9h20"></path>
    </svg>`,
    medal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"></path>
      <path d="M11 12 5.12 2.2"></path>
      <path d="m13 12 5.88-9.8"></path>
      <path d="M8 7h8"></path>
      <circle cx="12" cy="17" r="5"></circle>
      <path d="M12 18v-2h-.5"></path>
    </svg>`,
    rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
    </svg>`,
    brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54"></path>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54"></path>
    </svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
    </svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
    </svg>`,
    puzzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707 2.402 2.402 0 0 1 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"></path>
    </svg>`,
    book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
    </svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>`,
    gift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <polyline points="20 12 20 22 4 22 4 12"></polyline>
      <rect x="2" y="7" width="20" height="5"></rect>
      <line x1="12" y1="22" x2="12" y2="7"></line>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
    </svg>`,
    sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
      <path d="M5 3v4"></path>
      <path d="M19 17v4"></path>
      <path d="M3 5h4"></path>
      <path d="M17 19h4"></path>
    </svg>`,
    lightning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>`,
    sword: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="achievement-icon-svg">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
      <line x1="13" y1="19" x2="19" y2="13"></line>
      <line x1="16" y1="16" x2="20" y2="20"></line>
      <line x1="19" y1="21" x2="21" y2="19"></line>
    </svg>`,
  };

  return icons[icon] || icons['award'];
}

function renderAchievementItem(achievement: Achievement): string {
  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;
  const color = rarityColors[rarity.color];
  // Rarity background colors with proper opacity
  const rarityBgColors: Record<string, string> = {
    slate: 'hsl(215 20% 65% / 0.1)',
    green: 'hsl(142 71% 45% / 0.15)',
    blue: 'hsl(217 91% 60% / 0.15)',
    purple: 'hsl(262 83% 58% / 0.15)',
    amber: 'hsl(45 93% 47% / 0.15)',
  };
  const bgColor = rarityBgColors[rarity.color] || rarityBgColors.slate;

  return `
    <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}" style="${achievement.unlocked ? `background: ${bgColor}` : ''}">
      <div class="achievement-icon-container" style="${achievement.unlocked ? `background: ${bgColor}` : ''}">
        ${achievement.unlocked ? getAchievementIcon(achievement.icon) : getLockIcon()}
      </div>
      <div class="achievement-content">
        <div class="achievement-name-row">
          <span class="achievement-name">${achievement.name}</span>
          ${achievement.unlocked ? `<span class="achievement-check" style="color: hsl(142 71% 45%)">${getCheckIcon()}</span>` : ''}
        </div>
        <span class="achievement-description">${achievement.description}</span>
      </div>
      <div class="achievement-meta">
        <span class="achievement-badge" style="background: ${color}20; color: ${color}">${rarity.label}</span>
        <span class="achievement-points">+${achievement.points}</span>
      </div>
    </div>
  `;
}

function renderAchievements(
  container: HTMLElement,
  data: { achievements: Achievement[]; progress: AchievementProgress }
): void {
  // Group by category
  const grouped = data.achievements.reduce((acc, a) => {
    const category = a.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(a);
    return acc;
  }, {} as Record<string, Achievement[]>);

  // Sort achievements within each category by order
  Object.values(grouped).forEach(achievements => {
    achievements.sort((a, b) => a.order - b.order);
  });

  container.innerHTML = `
    <style>
      .achievements-page {
        padding: var(--spacing-lg);
        max-width: 800px;
        margin: 0 auto;
      }

      .page-header {
        margin-bottom: var(--spacing-lg);
      }

      .page-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        margin-bottom: var(--spacing-xs);
      }

      .page-subtitle {
        color: hsl(var(--muted-foreground));
        font-size: var(--font-size-sm);
      }

      .progress-container {
        margin-bottom: var(--spacing-xl);
      }

      .progress-bar {
        height: 8px;
        background: hsl(var(--muted));
        border-radius: var(--radius-full);
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: hsl(var(--primary));
        border-radius: var(--radius-full);
        transition: width 0.5s ease;
      }

      .achievement-category {
        margin-bottom: var(--spacing-xl);
      }

      .category-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
        padding-bottom: var(--spacing-sm);
        border-bottom: 1px solid hsl(var(--border));
      }

      .category-title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        text-transform: capitalize;
      }

      .category-count {
        font-size: var(--font-size-xs);
        color: hsl(var(--muted-foreground));
        margin-left: auto;
      }

      .achievements-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .achievement-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: hsl(var(--card));
        border-radius: var(--radius-lg);
        transition: all var(--transition-fast);
      }

      .achievement-item:hover {
        background: hsl(var(--accent));
      }

      .achievement-item.locked {
        opacity: 0.6;
        background: hsl(var(--muted) / 0.4);
      }

      .achievement-icon-container {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--muted));
        border-radius: var(--radius-full);
        flex-shrink: 0;
      }

      .achievement-item.unlocked .achievement-icon-container {
        color: currentColor;
      }

      .achievement-icon-svg {
        width: 16px;
        height: 16px;
      }

      .achievement-check-svg {
        width: 14px;
        height: 14px;
      }

      .achievement-content {
        flex: 1;
        min-width: 0;
      }

      .achievement-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .achievement-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .achievement-check {
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }

      .achievement-description {
        display: block;
        font-size: var(--font-size-xs);
        color: hsl(var(--muted-foreground));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .achievement-meta {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex-shrink: 0;
      }

      .achievement-badge {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        padding: 0.125rem 0.5rem;
        border-radius: var(--radius-full);
      }

      .achievement-points {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: hsl(var(--foreground));
        background: hsl(var(--muted));
        padding: 0.125rem 0.5rem;
        border-radius: var(--radius-sm);
      }

      .empty-state {
        text-align: center;
        padding: var(--spacing-2xl);
        color: hsl(var(--muted-foreground));
      }
    </style>

    <div class="achievements-page">
      <div class="page-header">
        <h1 class="page-title">Achievements</h1>
        <p class="page-subtitle">${data.progress.unlocked}/${data.progress.total} unlocked</p>
      </div>

      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${data.progress.percentage}%"></div>
        </div>
      </div>

      ${Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([category, achievements]) => {
        const unlockedCount = achievements.filter(a => a.unlocked).length;
        return `
        <div class="achievement-category">
          <div class="category-header">
            <h3 class="category-title">${category}</h3>
            <span class="category-count">${unlockedCount}/${achievements.length}</span>
          </div>
          <div class="achievements-list">
            ${achievements.map(a => renderAchievementItem(a)).join('')}
          </div>
        </div>
      `}).join('') : `
        <div class="empty-state">
          <p>No achievements available yet.</p>
          <p>Complete puzzles to unlock achievements!</p>
        </div>
      `}
    </div>
  `;
}

function renderError(container: HTMLElement, message: string): void {
  container.innerHTML = `
    <div class="error-page">
      <h1>Error</h1>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
    </div>
  `;
}

export async function createAchievementsPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page';

  // Loading state
  page.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading achievements...</p>
    </div>
  `;

  try {
    const data = await api.getAchievements();
    renderAchievements(page, data);
  } catch (error) {
    console.error('Failed to load achievements:', error);
    renderError(page, 'Failed to load achievements');
  }

  return page;
}
