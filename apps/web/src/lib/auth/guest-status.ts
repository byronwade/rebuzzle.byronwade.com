const GUEST_EMAIL_SUFFIX = "@guest.rebuzzle.local";

/** Prefer an explicit account role while retaining support for pre-claim guest sessions. */
export function resolveGuestStatus(isGuest: boolean | undefined, email?: string | null): boolean {
  return isGuest ?? Boolean(email?.endsWith(GUEST_EMAIL_SUFFIX));
}
