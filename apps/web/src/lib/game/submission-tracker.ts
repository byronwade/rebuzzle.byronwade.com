/**
 * Orders server-session restores against guess submissions on the daily board.
 *
 * A first-time guest's guess creates the guest session, which refreshes auth and
 * starts a restore while the guess is still being scored. A restore snapshot read
 * before (or while) a guess was being scored can arrive after the guess response
 * and must not overwrite the confirmed guess history.
 */
export type SubmissionSnapshot = { epoch: number; busy: boolean };

export function createSubmissionTracker() {
  let epoch = 0;
  let inFlight = 0;

  return {
    /** Mark a submission as started; call the returned function once it settles. */
    begin(): () => void {
      epoch += 1;
      inFlight += 1;
      let ended = false;
      return () => {
        if (ended) return;
        ended = true;
        inFlight -= 1;
      };
    },
    /** Capture submission state when a restore begins. */
    snapshot(): SubmissionSnapshot {
      return { epoch, busy: inFlight > 0 };
    },
    /** True when a restore begun at `snapshot` may predate a submission's result. */
    isStale(snapshot: SubmissionSnapshot): boolean {
      return snapshot.busy || inFlight > 0 || epoch !== snapshot.epoch;
    },
  };
}
