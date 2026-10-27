import { readFileSync } from "node:fs";
import path from "node:path";

jest.mock("@/lib/cron/auth", () => ({ authorizeCron: jest.fn() }));
jest.mock("@/db/daily-progress-backfill", () => ({ runJourneyProgressBackfill: jest.fn() }));

import { runJourneyProgressBackfill } from "@/db/daily-progress-backfill";
import { authorizeCron } from "@/lib/cron/auth";
import { GET } from "../route";

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(authorizeCron).mockReturnValue({ ok: true });
  jest.mocked(runJourneyProgressBackfill).mockResolvedValue({
    usersCompleted: 2,
    processed: 4,
    inserted: 1,
    skipped: 3,
    errors: 0,
  });
});

it("requires cron authorization", async () => {
  jest.mocked(authorizeCron).mockReturnValue({
    ok: false,
    response: Response.json({ success: false, error: "Unauthorized" }, { status: 401 }) as never,
  });

  const response = await GET(
    new Request("https://rebuzzle.test/api/cron/reconcile-journey-progress")
  );

  expect(response.status).toBe(401);
  expect(runJourneyProgressBackfill).not.toHaveBeenCalled();
});

it("runs only pending account reconciliations", async () => {
  const response = await GET(
    new Request("https://rebuzzle.test/api/cron/reconcile-journey-progress")
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    success: true,
    usersCompleted: 2,
    processed: 4,
    inserted: 1,
    skipped: 3,
    errors: 0,
  });
  expect(runJourneyProgressBackfill).toHaveBeenCalledWith({ onlyReconciliationPending: true });
});

it("registers the daily reconciliation job in both Vercel manifests", () => {
  const rootConfig = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "../../vercel.json"), "utf8")
  );
  const webConfig = JSON.parse(readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8"));
  const expected = { path: "/api/cron/reconcile-journey-progress", schedule: "0 2 * * *" };

  expect(rootConfig.crons).toContainEqual(expected);
  expect(webConfig.crons).toContainEqual(expected);
});
