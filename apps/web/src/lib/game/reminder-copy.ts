/**
 * Single source of truth for daily reminder timing copy.
 * Puzzle publish: UTC midnight. Puzzle-ready email cron: 16:00 UTC.
 */

export const PUZZLE_PUBLISH_COPY = "UTC midnight";
export const PUZZLE_EMAIL_REMINDER_COPY = "4 PM UTC";
export const PUZZLE_EMAIL_REMINDER_SHORT = "4 PM UTC";

export function dailyReminderEnabledBlurb(): string {
  return `Daily puzzle email around ${PUZZLE_EMAIL_REMINDER_COPY} · new puzzle at ${PUZZLE_PUBLISH_COPY}`;
}

export function dailyReminderOptInCta(): string {
  return `Email me tomorrow (${PUZZLE_EMAIL_REMINDER_SHORT})`;
}

export function dailyReminderDialogBlurb(): string {
  return `Get a daily email when today's puzzle is ready (around ${PUZZLE_EMAIL_REMINDER_COPY}). New puzzles publish at ${PUZZLE_PUBLISH_COPY}.`;
}
