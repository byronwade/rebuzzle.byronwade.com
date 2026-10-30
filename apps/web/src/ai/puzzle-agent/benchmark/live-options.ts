export type LivePilotTarget =
  | { mode: "tier-canary"; targets: [] }
  | { mode: "daily-pilot"; targets: number[] };

/** Opt-in daily-only diagnostic mode; absent option retains four-tier canary semantics. */
export function parseLivePilotTarget(argv: string[]): LivePilotTarget {
  const argument = argv.find((value) => value.startsWith("--target-difficulty="));
  if (!argument) return { mode: "tier-canary", targets: [] };
  const raw = argument.slice("--target-difficulty=".length);
  if (raw === "7..9") return { mode: "daily-pilot", targets: [7, 8, 9] };
  if (/^[789]$/.test(raw)) return { mode: "daily-pilot", targets: [Number(raw)] };
  throw new Error("--target-difficulty must be 7, 8, 9, or 7..9 for a daily-only pilot");
}

export function safeDiagnosticError(error: unknown, secrets: string[] = []): string {
  let message = (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, " ");
  for (const secret of secrets.filter(Boolean)) {
    message = message.replaceAll(secret, "[redacted]");
  }
  return message.slice(0, 800);
}

export function assertPilotDailyAdmission(
  mode: LivePilotTarget["mode"],
  admission: { admitted: boolean; blockers: string[] }
): void {
  if (mode === "daily-pilot" && !admission.admitted) {
    throw new Error(`Daily admission rejected: ${admission.blockers.join("; ")}`);
  }
}
