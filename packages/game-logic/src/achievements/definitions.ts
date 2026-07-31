/**
 * Achievement Definitions
 *
 * 100 achievements ranging from easy to extremely hard
 * Categories: Beginner, Solving, Speed, Streaks, Mastery, Social, Explorer, Collector, Elite, Legendary
 */

export type AchievementCategory =
  | "beginner"
  | "solving"
  | "speed"
  | "streaks"
  | "mastery"
  | "social"
  | "explorer"
  | "collector"
  | "elite"
  | "legendary";

export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type AchievementIcon =
  | "trophy"
  | "star"
  | "zap"
  | "flame"
  | "target"
  | "clock"
  | "crown"
  | "gem"
  | "medal"
  | "rocket"
  | "brain"
  | "lightning"
  | "heart"
  | "shield"
  | "sword"
  | "puzzle"
  | "book"
  | "calendar"
  | "gift"
  | "sparkles";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  hint: string; // Hint for how to unlock
  icon: AchievementIcon;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  // Unlock criteria
  criteria: AchievementCriteria;
  // For display ordering
  order: number;
  // Secret achievements don't show details until unlocked
  secret?: boolean;
}

export type AchievementCriteria =
  | { type: "first_puzzle" }
  | { type: "puzzles_solved"; count: number }
  | { type: "puzzles_solved_no_hints"; count: number }
  | { type: "perfect_solves"; count: number } // First attempt
  | { type: "streak_days"; count: number }
  | { type: "max_streak"; count: number }
  | { type: "speed_solve"; seconds: number }
  | { type: "speed_solve_count"; seconds: number; count: number }
  | { type: "total_points"; points: number }
  | { type: "level_reached"; level: number }
  | { type: "clutch_solves"; count: number } // Last attempt wins
  | { type: "daily_challenges"; count: number }
  | { type: "weekly_puzzles"; count: number } // Puzzles in a single week
  | { type: "total_attempts"; count: number }
  | { type: "win_rate"; percentage: number; minGames: number }
  | { type: "difficulty_easy"; count: number }
  | { type: "difficulty_medium"; count: number }
  | { type: "difficulty_hard"; count: number }
  | { type: "all_difficulties_in_day" }
  | { type: "comeback"; behindAttempts: number } // Win after using X attempts
  | { type: "no_hints_streak"; count: number }
  | { type: "account_age_days"; days: number }
  | { type: "games_in_day"; count: number }
  | { type: "consecutive_perfect"; count: number }
  | { type: "total_time_played"; minutes: number }
  | { type: "categories_completed"; count: number }
  | { type: "hints_used_total"; count: number }
  | { type: "share_result" }
  | { type: "profile_complete" }
  | { type: "leaderboard_top"; position: number }
  | { type: "leaderboard_top_weekly"; position: number }
  | { type: "special_date"; date: string } // e.g., "01-01" for New Year
  | { type: "night_owl"; hour: number } // Solve after midnight
  | { type: "early_bird"; hour: number } // Solve before 6am
  | { type: "weekend_warrior"; count: number } // Weekend solves
  | { type: "custom"; check: string }; // For complex checks

// ============================================================================
// BEGINNER ACHIEVEMENTS (1-10) - Easy to get, welcome new players
// ============================================================================
const beginnerAchievements: AchievementDefinition[] = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Solved your very first puzzle",
    hint: "Complete any puzzle to unlock",
    icon: "star",
    category: "beginner",
    rarity: "common",
    points: 10,
    criteria: { type: "first_puzzle" },
    order: 1,
  },
  {
    id: "getting_started",
    name: "Getting Started",
    description: "Solved 5 puzzles",
    hint: "Keep solving puzzles!",
    icon: "puzzle",
    category: "beginner",
    rarity: "common",
    points: 15,
    criteria: { type: "puzzles_solved", count: 5 },
    order: 2,
  },
  {
    id: "puzzle_apprentice",
    name: "Puzzle Apprentice",
    description: "Solved 10 puzzles",
    hint: "You're getting the hang of it!",
    icon: "book",
    category: "beginner",
    rarity: "common",
    points: 20,
    criteria: { type: "puzzles_solved", count: 10 },
    order: 3,
  },
  {
    id: "first_perfect",
    name: "Nailed It!",
    description: "Solved a puzzle on your first attempt",
    hint: "Get it right the first time",
    icon: "target",
    category: "beginner",
    rarity: "common",
    points: 25,
    criteria: { type: "perfect_solves", count: 1 },
    order: 4,
    secret: true, // Psychology: Surprise reward for first-time perfection
  },
  {
    id: "streak_starter",
    name: "Streak Starter",
    description: "Achieved a 2-day solving streak",
    hint: "Play two days in a row",
    icon: "flame",
    category: "beginner",
    rarity: "common",
    points: 20,
    criteria: { type: "streak_days", count: 2 },
    order: 5,
  },
  {
    id: "hint_helper",
    name: "Hint Helper",
    description: "Used hints to solve 3 puzzles",
    hint: "Hints are there to help!",
    icon: "gift",
    category: "beginner",
    rarity: "common",
    points: 10,
    criteria: { type: "hints_used_total", count: 3 },
    order: 6,
  },
  {
    id: "point_collector",
    name: "Point Collector",
    description: "Earned your first 100 points",
    hint: "Points add up quickly",
    icon: "gem",
    category: "beginner",
    rarity: "common",
    points: 15,
    criteria: { type: "total_points", points: 100 },
    order: 7,
  },
  {
    id: "level_up",
    name: "Level Up!",
    description: "Reached level 2",
    hint: "Keep earning points to level up",
    icon: "rocket",
    category: "beginner",
    rarity: "common",
    points: 20,
    criteria: { type: "level_reached", level: 2 },
    order: 8,
  },
  {
    id: "daily_player",
    name: "Daily Player",
    description: "Completed your first daily challenge",
    hint: "Try the daily puzzle",
    icon: "calendar",
    category: "beginner",
    rarity: "common",
    points: 15,
    criteria: { type: "daily_challenges", count: 1 },
    order: 9,
  },
  {
    id: "one_week_old",
    name: "One Week Old",
    description: "Account is one week old",
    hint: "Time flies when you're having fun",
    icon: "heart",
    category: "beginner",
    rarity: "common",
    points: 10,
    criteria: { type: "account_age_days", days: 7 },
    order: 10,
  },
];

// ============================================================================
// SOLVING ACHIEVEMENTS (11-25) - Based on total puzzles solved
// ============================================================================
const solvingAchievements: AchievementDefinition[] = [
  {
    id: "puzzle_solver",
    name: "Puzzle Solver",
    description: "Solved 25 puzzles",
    hint: "Keep at it!",
    icon: "puzzle",
    category: "solving",
    rarity: "common",
    points: 30,
    criteria: { type: "puzzles_solved", count: 25 },
    order: 11,
  },
  {
    id: "half_century",
    name: "Half Century",
    description: "Solved 50 puzzles",
    hint: "Halfway to a hundred!",
    icon: "medal",
    category: "solving",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "puzzles_solved", count: 50 },
    order: 12,
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Solved 100 puzzles",
    hint: "A true centurion",
    icon: "trophy",
    category: "solving",
    rarity: "uncommon",
    points: 100,
    criteria: { type: "puzzles_solved", count: 100 },
    order: 13,
  },
  {
    id: "puzzle_enthusiast",
    name: "Puzzle Enthusiast",
    description: "Solved 200 puzzles",
    hint: "Puzzles are your passion",
    icon: "star",
    category: "solving",
    rarity: "rare",
    points: 150,
    criteria: { type: "puzzles_solved", count: 200 },
    order: 14,
  },
  {
    id: "puzzle_master",
    name: "Puzzle Master",
    description: "Solved 500 puzzles",
    hint: "Master of the puzzles",
    icon: "crown",
    category: "solving",
    rarity: "epic",
    points: 300,
    criteria: { type: "puzzles_solved", count: 500 },
    order: 15,
  },
  {
    id: "puzzle_legend",
    name: "Puzzle Legend",
    description: "Solved 1000 puzzles",
    hint: "Legendary status achieved",
    icon: "crown",
    category: "solving",
    rarity: "legendary",
    points: 500,
    criteria: { type: "puzzles_solved", count: 1000 },
    order: 16,
  },
  {
    id: "pure_skill_5",
    name: "Sharp Mind",
    description: "Solved 5 puzzles without hints",
    hint: "Trust your instincts",
    icon: "brain",
    category: "solving",
    rarity: "common",
    points: 25,
    criteria: { type: "puzzles_solved_no_hints", count: 5 },
    order: 17,
  },
  {
    id: "pure_skill_25",
    name: "No Assistance Needed",
    description: "Solved 25 puzzles without hints",
    hint: "Who needs hints anyway?",
    icon: "brain",
    category: "solving",
    rarity: "uncommon",
    points: 75,
    criteria: { type: "puzzles_solved_no_hints", count: 25 },
    order: 18,
  },
  {
    id: "pure_skill_100",
    name: "Hint Free Zone",
    description: "Solved 100 puzzles without hints",
    hint: "Hints? What hints?",
    icon: "brain",
    category: "solving",
    rarity: "rare",
    points: 200,
    criteria: { type: "puzzles_solved_no_hints", count: 100 },
    order: 19,
  },
  {
    id: "perfectionist_10",
    name: "Perfectionist",
    description: "10 perfect solves (first attempt)",
    hint: "Practice makes perfect",
    icon: "target",
    category: "solving",
    rarity: "uncommon",
    points: 75,
    criteria: { type: "perfect_solves", count: 10 },
    order: 20,
  },
  {
    id: "perfectionist_50",
    name: "Flawless",
    description: "50 perfect solves (first attempt)",
    hint: "Consistently perfect",
    icon: "target",
    category: "solving",
    rarity: "rare",
    points: 200,
    criteria: { type: "perfect_solves", count: 50 },
    order: 21,
  },
  {
    id: "perfectionist_100",
    name: "Untouchable",
    description: "100 perfect solves (first attempt)",
    hint: "Perfection incarnate",
    icon: "target",
    category: "solving",
    rarity: "epic",
    points: 400,
    criteria: { type: "perfect_solves", count: 100 },
    order: 22,
  },
  {
    id: "clutch_player",
    name: "Clutch Player",
    description: "Won 5 puzzles on the last attempt",
    hint: "Never give up!",
    icon: "trophy",
    category: "solving",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "clutch_solves", count: 5 },
    order: 23,
    secret: true, // Psychology: Surprise reward for persistence
  },
  {
    id: "clutch_master",
    name: "Clutch Master",
    description: "Won 25 puzzles on the last attempt",
    hint: "Thrives under pressure",
    icon: "trophy",
    category: "solving",
    rarity: "rare",
    points: 150,
    criteria: { type: "clutch_solves", count: 25 },
    order: 24,
  },
  {
    id: "never_surrender",
    name: "Never Surrender",
    description: "Won 100 puzzles on the last attempt",
    hint: "The ultimate clutch player",
    icon: "shield",
    category: "solving",
    rarity: "epic",
    points: 350,
    criteria: { type: "clutch_solves", count: 100 },
    order: 25,
  },
];

// ============================================================================
// SPEED ACHIEVEMENTS (26-40) - Based on solving time
// ============================================================================
const speedAchievements: AchievementDefinition[] = [
  {
    id: "quick_thinker",
    name: "Quick Thinker",
    description: "Solved a puzzle in under 60 seconds",
    hint: "Speed is key",
    icon: "clock",
    category: "speed",
    rarity: "common",
    points: 20,
    criteria: { type: "speed_solve", seconds: 60 },
    order: 26,
  },
  {
    id: "speed_solver",
    name: "Speed Solver",
    description: "Solved a puzzle in under 30 seconds",
    hint: "Lightning fast!",
    icon: "zap",
    category: "speed",
    rarity: "uncommon",
    points: 40,
    criteria: { type: "speed_solve", seconds: 30 },
    order: 27,
  },
  {
    id: "lightning_fast",
    name: "Lightning Fast",
    description: "Solved a puzzle in under 15 seconds",
    hint: "Blink and you'll miss it",
    icon: "lightning",
    category: "speed",
    rarity: "rare",
    points: 100,
    criteria: { type: "speed_solve", seconds: 15 },
    order: 28,
  },
  {
    id: "instant_genius",
    name: "Instant Genius",
    description: "Solved a puzzle in under 10 seconds",
    hint: "Are you even human?",
    icon: "lightning",
    category: "speed",
    rarity: "epic",
    points: 200,
    criteria: { type: "speed_solve", seconds: 10 },
    order: 29,
    secret: true, // Psychology: Surprise for exceptional speed
  },
  {
    id: "speed_demon_5",
    name: "Speed Demon",
    description: "Solved 5 puzzles in under 30 seconds each",
    hint: "Consistently quick",
    icon: "zap",
    category: "speed",
    rarity: "uncommon",
    points: 60,
    criteria: { type: "speed_solve_count", seconds: 30, count: 5 },
    order: 30,
  },
  {
    id: "speed_demon_25",
    name: "Velocity Master",
    description: "Solved 25 puzzles in under 30 seconds each",
    hint: "Speed is your middle name",
    icon: "zap",
    category: "speed",
    rarity: "rare",
    points: 150,
    criteria: { type: "speed_solve_count", seconds: 30, count: 25 },
    order: 31,
  },
  {
    id: "speed_demon_100",
    name: "The Flash",
    description: "Solved 100 puzzles in under 30 seconds each",
    hint: "Faster than light",
    icon: "lightning",
    category: "speed",
    rarity: "epic",
    points: 400,
    criteria: { type: "speed_solve_count", seconds: 30, count: 100 },
    order: 32,
  },
  {
    id: "sub_15_master",
    name: "Sub-15 Master",
    description: "Solved 10 puzzles in under 15 seconds each",
    hint: "Blazing speed",
    icon: "lightning",
    category: "speed",
    rarity: "rare",
    points: 200,
    criteria: { type: "speed_solve_count", seconds: 15, count: 10 },
    order: 33,
  },
  {
    id: "sub_15_legend",
    name: "Sub-15 Legend",
    description: "Solved 50 puzzles in under 15 seconds each",
    hint: "Inhuman reflexes",
    icon: "lightning",
    category: "speed",
    rarity: "legendary",
    points: 500,
    criteria: { type: "speed_solve_count", seconds: 15, count: 50 },
    order: 34,
  },
  {
    id: "time_attack_5",
    name: "Time Attack",
    description: "Solved 5 puzzles in a single day",
    hint: "Productive day!",
    icon: "clock",
    category: "speed",
    rarity: "common",
    points: 25,
    criteria: { type: "games_in_day", count: 5 },
    order: 35,
  },
  {
    id: "time_attack_10",
    name: "Marathon Runner",
    description: "Solved 10 puzzles in a single day",
    hint: "What a session!",
    icon: "clock",
    category: "speed",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "games_in_day", count: 10 },
    order: 36,
  },
  {
    id: "time_attack_25",
    name: "Puzzle Marathoner",
    description: "Solved 25 puzzles in a single day",
    hint: "Dedication!",
    icon: "medal",
    category: "speed",
    rarity: "rare",
    points: 150,
    criteria: { type: "games_in_day", count: 25 },
    order: 37,
  },
  {
    id: "weekly_warrior",
    name: "Weekly Warrior",
    description: "Solved 20 puzzles in a single week",
    hint: "Great week!",
    icon: "sword",
    category: "speed",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "weekly_puzzles", count: 20 },
    order: 38,
  },
  {
    id: "weekly_champion",
    name: "Weekly Champion",
    description: "Solved 50 puzzles in a single week",
    hint: "What a week!",
    icon: "trophy",
    category: "speed",
    rarity: "rare",
    points: 150,
    criteria: { type: "weekly_puzzles", count: 50 },
    order: 39,
  },
  {
    id: "total_playtime",
    name: "Dedicated Player",
    description: "Played for a total of 10 hours",
    hint: "Time well spent",
    icon: "clock",
    category: "speed",
    rarity: "rare",
    points: 100,
    criteria: { type: "total_time_played", minutes: 600 },
    order: 40,
  },
];

// ============================================================================
// STREAK ACHIEVEMENTS (41-55) - Based on consecutive days
// ============================================================================
const streakAchievements: AchievementDefinition[] = [
  {
    id: "three_day_streak",
    name: "Three in a Row",
    description: "3-day solving streak",
    hint: "Keep the momentum!",
    icon: "flame",
    category: "streaks",
    rarity: "common",
    points: 25,
    criteria: { type: "streak_days", count: 3 },
    order: 41,
  },
  {
    id: "week_streak",
    name: "Perfect Week",
    description: "7-day solving streak",
    hint: "A full week!",
    icon: "flame",
    category: "streaks",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "streak_days", count: 7 },
    order: 42,
  },
  {
    id: "two_week_streak",
    name: "Fortnight Fighter",
    description: "14-day solving streak",
    hint: "Two weeks strong!",
    icon: "flame",
    category: "streaks",
    rarity: "rare",
    points: 100,
    criteria: { type: "streak_days", count: 14 },
    order: 43,
  },
  {
    id: "month_streak",
    name: "Month Master",
    description: "30-day solving streak",
    hint: "A full month!",
    icon: "flame",
    category: "streaks",
    rarity: "rare",
    points: 200,
    criteria: { type: "streak_days", count: 30 },
    order: 44,
  },
  {
    id: "60_day_streak",
    name: "Two Month Titan",
    description: "60-day solving streak",
    hint: "Incredible dedication!",
    icon: "flame",
    category: "streaks",
    rarity: "epic",
    points: 350,
    criteria: { type: "streak_days", count: 60 },
    order: 45,
  },
  {
    id: "90_day_streak",
    name: "Quarter Year Champion",
    description: "90-day solving streak",
    hint: "Three months straight!",
    icon: "flame",
    category: "streaks",
    rarity: "epic",
    points: 500,
    criteria: { type: "streak_days", count: 90 },
    order: 46,
  },
  {
    id: "half_year_streak",
    name: "Half Year Hero",
    description: "180-day solving streak",
    hint: "Six months of dedication!",
    icon: "crown",
    category: "streaks",
    rarity: "legendary",
    points: 750,
    criteria: { type: "streak_days", count: 180 },
    order: 47,
  },
  {
    id: "year_streak",
    name: "Year-Round Champion",
    description: "365-day solving streak",
    hint: "A full year! Incredible!",
    icon: "crown",
    category: "streaks",
    rarity: "legendary",
    points: 1000,
    criteria: { type: "streak_days", count: 365 },
    order: 48,
  },
  {
    id: "comeback_king",
    name: "Comeback King",
    description: "Won after using 3+ attempts",
    hint: "Never give up!",
    icon: "trophy",
    category: "streaks",
    rarity: "common",
    points: 20,
    criteria: { type: "comeback", behindAttempts: 3 },
    order: 49,
  },
  {
    id: "no_hints_streak_5",
    name: "Hint-Free Streak",
    description: "5 consecutive puzzles without hints",
    hint: "Trust yourself!",
    icon: "star",
    category: "streaks",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "no_hints_streak", count: 5 },
    order: 50,
  },
  {
    id: "no_hints_streak_15",
    name: "Self-Reliant",
    description: "15 consecutive puzzles without hints",
    hint: "Who needs help?",
    icon: "star",
    category: "streaks",
    rarity: "rare",
    points: 125,
    criteria: { type: "no_hints_streak", count: 15 },
    order: 51,
  },
  {
    id: "no_hints_streak_30",
    name: "Solo Master",
    description: "30 consecutive puzzles without hints",
    hint: "Completely independent",
    icon: "brain",
    category: "streaks",
    rarity: "epic",
    points: 250,
    criteria: { type: "no_hints_streak", count: 30 },
    order: 52,
  },
  {
    id: "perfect_streak_3",
    name: "Triple Threat",
    description: "3 consecutive perfect solves",
    hint: "Three in a row!",
    icon: "target",
    category: "streaks",
    rarity: "uncommon",
    points: 75,
    criteria: { type: "consecutive_perfect", count: 3 },
    order: 53,
  },
  {
    id: "perfect_streak_7",
    name: "Perfect Week",
    description: "7 consecutive perfect solves",
    hint: "A perfect week!",
    icon: "target",
    category: "streaks",
    rarity: "rare",
    points: 200,
    criteria: { type: "consecutive_perfect", count: 7 },
    order: 54,
    secret: true, // Psychology: Hidden challenge for perfectionists
  },
  {
    id: "perfect_streak_14",
    name: "Flawless Fortnight",
    description: "14 consecutive perfect solves",
    hint: "Two weeks of perfection!",
    icon: "crown",
    category: "streaks",
    rarity: "legendary",
    points: 500,
    criteria: { type: "consecutive_perfect", count: 14 },
    order: 55,
  },
];

// ============================================================================
// MASTERY ACHIEVEMENTS (56-70) - Points, levels, and win rates
// ============================================================================
const masteryAchievements: AchievementDefinition[] = [
  {
    id: "points_500",
    name: "Rising Star",
    description: "Earned 500 total points",
    hint: "Points are adding up!",
    icon: "gem",
    category: "mastery",
    rarity: "common",
    points: 30,
    criteria: { type: "total_points", points: 500 },
    order: 56,
  },
  {
    id: "points_1000",
    name: "Point Thousand",
    description: "Earned 1,000 total points",
    hint: "A grand milestone!",
    icon: "gem",
    category: "mastery",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "total_points", points: 1000 },
    order: 57,
  },
  {
    id: "points_5000",
    name: "High Scorer",
    description: "Earned 5,000 total points",
    hint: "Climbing the ranks!",
    icon: "trophy",
    category: "mastery",
    rarity: "rare",
    points: 150,
    criteria: { type: "total_points", points: 5000 },
    order: 58,
  },
  {
    id: "points_10000",
    name: "Ten Thousand Strong",
    description: "Earned 10,000 total points",
    hint: "Elite status!",
    icon: "crown",
    category: "mastery",
    rarity: "epic",
    points: 300,
    criteria: { type: "total_points", points: 10000 },
    order: 59,
  },
  {
    id: "points_50000",
    name: "Point Legend",
    description: "Earned 50,000 total points",
    hint: "Legendary scorer!",
    icon: "crown",
    category: "mastery",
    rarity: "legendary",
    points: 500,
    criteria: { type: "total_points", points: 50000 },
    order: 60,
  },
  {
    id: "level_5",
    name: "Level 5",
    description: "Reached level 5",
    hint: "Keep leveling up!",
    icon: "rocket",
    category: "mastery",
    rarity: "common",
    points: 25,
    criteria: { type: "level_reached", level: 5 },
    order: 61,
  },
  {
    id: "level_10",
    name: "Double Digits",
    description: "Reached level 10",
    hint: "In the double digits!",
    icon: "rocket",
    category: "mastery",
    rarity: "uncommon",
    points: 75,
    criteria: { type: "level_reached", level: 10 },
    order: 62,
  },
  {
    id: "level_25",
    name: "Quarter Century",
    description: "Reached level 25",
    hint: "A major milestone!",
    icon: "medal",
    category: "mastery",
    rarity: "rare",
    points: 200,
    criteria: { type: "level_reached", level: 25 },
    order: 63,
  },
  {
    id: "level_50",
    name: "Halfway Master",
    description: "Reached level 50",
    hint: "Halfway to the top!",
    icon: "crown",
    category: "mastery",
    rarity: "epic",
    points: 400,
    criteria: { type: "level_reached", level: 50 },
    order: 64,
  },
  {
    id: "level_100",
    name: "Centurion",
    description: "Reached level 100",
    hint: "The ultimate level!",
    icon: "crown",
    category: "mastery",
    rarity: "legendary",
    points: 1000,
    criteria: { type: "level_reached", level: 100 },
    order: 65,
  },
  {
    id: "win_rate_70",
    name: "Consistent Winner",
    description: "Maintained 70%+ win rate (50+ games)",
    hint: "Win more than you lose!",
    icon: "target",
    category: "mastery",
    rarity: "uncommon",
    points: 75,
    criteria: { type: "win_rate", percentage: 70, minGames: 50 },
    order: 66,
  },
  {
    id: "win_rate_80",
    name: "Dominant Force",
    description: "Maintained 80%+ win rate (100+ games)",
    hint: "Winning is your habit!",
    icon: "trophy",
    category: "mastery",
    rarity: "rare",
    points: 200,
    criteria: { type: "win_rate", percentage: 80, minGames: 100 },
    order: 67,
  },
  {
    id: "win_rate_90",
    name: "Near Perfect Record",
    description: "Maintained 90%+ win rate (200+ games)",
    hint: "Almost unbeatable!",
    icon: "crown",
    category: "mastery",
    rarity: "epic",
    points: 400,
    criteria: { type: "win_rate", percentage: 90, minGames: 200 },
    order: 68,
  },
  {
    id: "daily_10",
    name: "Daily Regular",
    description: "Completed 10 daily challenges",
    hint: "Come back daily!",
    icon: "calendar",
    category: "mastery",
    rarity: "common",
    points: 30,
    criteria: { type: "daily_challenges", count: 10 },
    order: 69,
  },
  {
    id: "daily_100",
    name: "Daily Devotee",
    description: "Completed 100 daily challenges",
    hint: "A true daily player!",
    icon: "calendar",
    category: "mastery",
    rarity: "rare",
    points: 200,
    criteria: { type: "daily_challenges", count: 100 },
    order: 70,
  },
];

// ============================================================================
// DIFFICULTY ACHIEVEMENTS (71-80) - Based on puzzle difficulty
// ============================================================================
const difficultyAchievements: AchievementDefinition[] = [
  {
    id: "easy_10",
    name: "Easy Street",
    description: "Solved 10 easy puzzles",
    hint: "Start with the basics!",
    icon: "puzzle",
    category: "explorer",
    rarity: "common",
    points: 15,
    criteria: { type: "difficulty_easy", count: 10 },
    order: 71,
  },
  {
    id: "easy_50",
    name: "Easy Expert",
    description: "Solved 50 easy puzzles",
    hint: "Easy doesn't mean boring!",
    icon: "puzzle",
    category: "explorer",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "difficulty_easy", count: 50 },
    order: 72,
  },
  {
    id: "medium_10",
    name: "Middle Ground",
    description: "Solved 10 medium puzzles",
    hint: "Finding balance!",
    icon: "puzzle",
    category: "explorer",
    rarity: "common",
    points: 25,
    criteria: { type: "difficulty_medium", count: 10 },
    order: 73,
  },
  {
    id: "medium_50",
    name: "Medium Master",
    description: "Solved 50 medium puzzles",
    hint: "The sweet spot!",
    icon: "medal",
    category: "explorer",
    rarity: "uncommon",
    points: 75,
    criteria: { type: "difficulty_medium", count: 50 },
    order: 74,
  },
  {
    id: "hard_10",
    name: "Challenge Seeker",
    description: "Solved 10 hard puzzles",
    hint: "Brave enough to try hard!",
    icon: "sword",
    category: "explorer",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "difficulty_hard", count: 10 },
    order: 75,
  },
  {
    id: "hard_50",
    name: "Hardened Veteran",
    description: "Solved 50 hard puzzles",
    hint: "Hard mode is your home!",
    icon: "shield",
    category: "explorer",
    rarity: "rare",
    points: 150,
    criteria: { type: "difficulty_hard", count: 50 },
    order: 76,
  },
  {
    id: "hard_100",
    name: "The Hard Way",
    description: "Solved 100 hard puzzles",
    hint: "No challenge too difficult!",
    icon: "crown",
    category: "explorer",
    rarity: "epic",
    points: 300,
    criteria: { type: "difficulty_hard", count: 100 },
    order: 77,
  },
  {
    id: "all_difficulties_day",
    name: "Well-Rounded",
    description: "Solved easy, medium, and hard puzzles in one day",
    hint: "Try all difficulties!",
    icon: "sparkles",
    category: "explorer",
    rarity: "uncommon",
    points: 40,
    criteria: { type: "all_difficulties_in_day" },
    order: 78,
  },
  {
    id: "hard_perfect",
    name: "Perfect Storm",
    description: "Perfect solve on a hard puzzle",
    hint: "First try on hard!",
    icon: "crown",
    category: "explorer",
    rarity: "rare",
    points: 100,
    criteria: { type: "custom", check: "hard_perfect_solve" },
    order: 79,
    secret: true, // Psychology: Hidden badge of honor
  },
  {
    id: "hard_speed",
    name: "Speed Demon Hard",
    description: "Solved a hard puzzle in under 30 seconds",
    hint: "Fast and furious on hard!",
    icon: "lightning",
    category: "explorer",
    rarity: "epic",
    points: 200,
    criteria: { type: "custom", check: "hard_speed_solve" },
    order: 80,
    secret: true, // Psychology: Elite hidden achievement
  },
];

// ============================================================================
// SOCIAL & SPECIAL ACHIEVEMENTS (81-90)
// ============================================================================
const socialAchievements: AchievementDefinition[] = [
  {
    id: "share_first",
    name: "Social Butterfly",
    description: "Shared your first result",
    hint: "Share with friends!",
    icon: "heart",
    category: "social",
    rarity: "common",
    points: 15,
    criteria: { type: "share_result" },
    order: 81,
  },
  {
    id: "profile_complete",
    name: "All Set Up",
    description: "Completed your profile",
    hint: "Fill out your profile!",
    icon: "star",
    category: "social",
    rarity: "common",
    points: 10,
    criteria: { type: "profile_complete" },
    order: 82,
  },
  {
    id: "leaderboard_top_100",
    name: "Top 100",
    description: "Reached top 100 on the leaderboard",
    hint: "Climb the ranks!",
    icon: "medal",
    category: "social",
    rarity: "rare",
    points: 100,
    criteria: { type: "leaderboard_top", position: 100 },
    order: 83,
  },
  {
    id: "leaderboard_top_50",
    name: "Top 50",
    description: "Reached top 50 on the leaderboard",
    hint: "Elite territory!",
    icon: "trophy",
    category: "social",
    rarity: "epic",
    points: 200,
    criteria: { type: "leaderboard_top", position: 50 },
    order: 84,
  },
  {
    id: "leaderboard_top_10",
    name: "Top 10",
    description: "Reached top 10 on the leaderboard",
    hint: "Almost the best!",
    icon: "crown",
    category: "social",
    rarity: "epic",
    points: 350,
    criteria: { type: "leaderboard_top", position: 10 },
    order: 85,
  },
  {
    id: "leaderboard_top_1",
    name: "Number One",
    description: "Reached #1 on the leaderboard",
    hint: "Be the best!",
    icon: "crown",
    category: "social",
    rarity: "legendary",
    points: 500,
    criteria: { type: "leaderboard_top", position: 1 },
    order: 86,
  },
  {
    id: "weekly_top_10",
    name: "Weekly Star",
    description: "Top 10 on weekly leaderboard",
    hint: "Dominate the week!",
    icon: "star",
    category: "social",
    rarity: "rare",
    points: 100,
    criteria: { type: "leaderboard_top_weekly", position: 10 },
    order: 87,
  },
  {
    id: "account_month",
    name: "One Month Old",
    description: "Account is one month old",
    hint: "Welcome to the club!",
    icon: "calendar",
    category: "social",
    rarity: "common",
    points: 25,
    criteria: { type: "account_age_days", days: 30 },
    order: 88,
  },
  {
    id: "account_year",
    name: "One Year Strong",
    description: "Account is one year old",
    hint: "A whole year!",
    icon: "heart",
    category: "social",
    rarity: "rare",
    points: 150,
    criteria: { type: "account_age_days", days: 365 },
    order: 89,
  },
  {
    id: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Solved 20 puzzles on weekends",
    hint: "Weekend puzzle sessions!",
    icon: "sword",
    category: "social",
    rarity: "uncommon",
    points: 50,
    criteria: { type: "weekend_warrior", count: 20 },
    order: 90,
    secret: true, // Psychology: Surprise for weekend players
  },
];

// ============================================================================
// LEGENDARY & SECRET ACHIEVEMENTS (91-100)
// ============================================================================
const legendaryAchievements: AchievementDefinition[] = [
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Solved a puzzle after midnight",
    hint: "Burn the midnight oil",
    icon: "star",
    category: "legendary",
    rarity: "uncommon",
    points: 30,
    criteria: { type: "night_owl", hour: 0 },
    order: 91,
    secret: true,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Solved a puzzle before 6 AM",
    hint: "Rise and shine!",
    icon: "sparkles",
    category: "legendary",
    rarity: "uncommon",
    points: 30,
    criteria: { type: "early_bird", hour: 6 },
    order: 92,
    secret: true,
  },
  {
    id: "new_year_solver",
    name: "New Year Solver",
    description: "Solved a puzzle on New Year's Day",
    hint: "Start the year right",
    icon: "sparkles",
    category: "legendary",
    rarity: "rare",
    points: 100,
    criteria: { type: "special_date", date: "01-01" },
    order: 93,
    secret: true,
  },
  {
    id: "valentines_solver",
    name: "Puzzle Love",
    description: "Solved a puzzle on Valentine's Day",
    hint: "Share the love of puzzles",
    icon: "heart",
    category: "legendary",
    rarity: "rare",
    points: 75,
    criteria: { type: "special_date", date: "02-14" },
    order: 94,
    secret: true,
  },
  {
    id: "halloween_solver",
    name: "Spooky Solver",
    description: "Solved a puzzle on Halloween",
    hint: "Trick or treat!",
    icon: "sparkles",
    category: "legendary",
    rarity: "rare",
    points: 75,
    criteria: { type: "special_date", date: "10-31" },
    order: 95,
    secret: true,
  },
  {
    id: "christmas_solver",
    name: "Holiday Spirit",
    description: "Solved a puzzle on Christmas",
    hint: "Holiday puzzle cheer!",
    icon: "gift",
    category: "legendary",
    rarity: "rare",
    points: 75,
    criteria: { type: "special_date", date: "12-25" },
    order: 96,
    secret: true,
  },
  {
    id: "ultimate_master",
    name: "Ultimate Master",
    description: "Unlocked 75 achievements",
    hint: "Collect them all!",
    icon: "crown",
    category: "legendary",
    rarity: "epic",
    points: 500,
    criteria: { type: "custom", check: "achievements_unlocked_75" },
    order: 97,
  },
  {
    id: "completionist",
    name: "Completionist",
    description: "Unlocked 90 achievements",
    hint: "Almost there!",
    icon: "crown",
    category: "legendary",
    rarity: "legendary",
    points: 750,
    criteria: { type: "custom", check: "achievements_unlocked_90" },
    order: 98,
  },
  {
    id: "the_collector",
    name: "The Collector",
    description: "Unlocked all 100 achievements",
    hint: "The ultimate goal!",
    icon: "crown",
    category: "legendary",
    rarity: "legendary",
    points: 1000,
    criteria: { type: "custom", check: "achievements_unlocked_100" },
    order: 99,
    secret: true,
  },
  {
    id: "puzzle_god",
    name: "Puzzle God",
    description: "Level 100 with 365-day streak and 95%+ win rate",
    hint: "The ultimate puzzle master",
    icon: "crown",
    category: "legendary",
    rarity: "legendary",
    points: 2000,
    criteria: { type: "custom", check: "puzzle_god" },
    order: 100,
    secret: true,
  },
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================
export const ALL_ACHIEVEMENTS: AchievementDefinition[] = [
  ...beginnerAchievements,
  ...solvingAchievements,
  ...speedAchievements,
  ...streakAchievements,
  ...masteryAchievements,
  ...difficultyAchievements,
  ...socialAchievements,
  ...legendaryAchievements,
];

// Helper functions
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ALL_ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.category === category);
}

export function getAchievementsByRarity(rarity: AchievementRarity): AchievementDefinition[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.rarity === rarity);
}

export function getTotalPossiblePoints(): number {
  return ALL_ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);
}

// Category display info
export const CATEGORY_INFO: Record<
  AchievementCategory,
  { name: string; description: string; icon: AchievementIcon }
> = {
  beginner: {
    name: "Getting Started",
    description: "Welcome to Rebuzzle!",
    icon: "star",
  },
  solving: {
    name: "Puzzle Solver",
    description: "Total puzzles solved milestones",
    icon: "puzzle",
  },
  speed: {
    name: "Speed Runner",
    description: "Quick solving achievements",
    icon: "zap",
  },
  streaks: {
    name: "Streak Master",
    description: "Consistency and dedication",
    icon: "flame",
  },
  mastery: {
    name: "Mastery",
    description: "Points, levels, and expertise",
    icon: "crown",
  },
  social: {
    name: "Social",
    description: "Community and sharing",
    icon: "heart",
  },
  explorer: {
    name: "Explorer",
    description: "Difficulty and variety",
    icon: "target",
  },
  collector: {
    name: "Collector",
    description: "Collecting achievements",
    icon: "gem",
  },
  elite: {
    name: "Elite",
    description: "Top-tier accomplishments",
    icon: "trophy",
  },
  legendary: {
    name: "Legendary",
    description: "The rarest achievements",
    icon: "sparkles",
  },
};

// Rarity display info
export const RARITY_INFO: Record<
  AchievementRarity,
  { name: string; color: string; bgColor: string }
> = {
  common: {
    name: "Common",
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
  },
  uncommon: {
    name: "Uncommon",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  rare: {
    name: "Rare",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  epic: {
    name: "Epic",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  legendary: {
    name: "Legendary",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
};
