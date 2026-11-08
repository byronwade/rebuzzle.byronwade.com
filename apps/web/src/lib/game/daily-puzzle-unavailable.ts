/** No owner-approved puzzle can be served for this date key. Routes map this to HTTP 503. */
export class DailyPuzzleUnavailableError extends Error {
  constructor(
    readonly dateKey: string,
    readonly reason: string
  ) {
    super(`No owner-approved daily puzzle for ${dateKey}: ${reason}`);
    this.name = "DailyPuzzleUnavailableError";
  }
}
