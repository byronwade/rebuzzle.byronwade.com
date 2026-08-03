/**
 * Single source of truth for daily reminder timing copy.
 * Puzzle publish: UTC midnight. Puzzle-ready email cron: 16:00 UTC.
 */

export const PUZZLE_PUBLISH_COPY = "UTC midnight";
export const PUZZLE_EMAIL_REMINDER_COPY = "4 PM UTC";
export const PUZZLE_EMAIL_REMINDER_SHORT = "4 PM UTC";

export function dailyReminderEnabledBlurb(): string {
  return `Email around ${PUZZLE_EMAIL_REMINDER_COPY}. Puzzle at ${PUZZLE_PUBLISH_COPY}.`;
}

export function dailyReminderOptInCta(): string {
  return "Email me tomorrow";
}

export function dailyReminderDialogBlurb(): string {
  return `Optional daily email when the puzzle is ready (around ${PUZZLE_EMAIL_REMINDER_COPY}).`;
}
