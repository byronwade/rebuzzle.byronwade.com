/**
 * Shared account field rules for signup and profile edits.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 40;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Usernames appear in profile URLs (/u/name): no slashes, query or fragment marks.
const USERNAME_FORBIDDEN = /[/\\?#%<>]/;

/** Emails are stored and looked up lowercase so casing never splits an account. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/** Returns an error message, or null when the username is acceptable. */
export function validateUsername(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return "Username is required";
  }
  const username = raw.trim();
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MAX_LENGTH} characters or less`;
  }
  if (USERNAME_FORBIDDEN.test(username)) {
    return "Username can’t contain / \\ ? # % < or >";
  }
  return null;
}
