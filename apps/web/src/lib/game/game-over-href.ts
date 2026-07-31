/** Build the optional deep-link to the full results page. */
export function buildGameOverHref(params: {
  success: boolean;
  guess: string;
  attempts: number;
  timeTakenSeconds?: number;
}): string {
  const search = new URLSearchParams({
    success: params.success ? "true" : "false",
    guess: params.guess,
    attempts: String(params.attempts),
  });
  if (typeof params.timeTakenSeconds === "number" && Number.isFinite(params.timeTakenSeconds)) {
    search.set("time", String(Math.max(0, Math.floor(params.timeTakenSeconds))));
  }
  return `/game-over?${search.toString()}`;
}

/** Session flag so game-over can skip a second confetti burst. */
export const JUST_SOLVED_SESSION_KEY = "rebuzzle:justSolved";

export function markJustSolvedInSession(): void {
  try {
    sessionStorage.setItem(JUST_SOLVED_SESSION_KEY, "1");
  } catch {
    // ignore
  }
}

export function consumeJustSolvedSessionFlag(): boolean {
  try {
    const value = sessionStorage.getItem(JUST_SOLVED_SESSION_KEY);
    if (value) {
      sessionStorage.removeItem(JUST_SOLVED_SESSION_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
