import { readFileSync } from "node:fs";
import path from "node:path";

const checkDatabaseHealth = jest.fn().mockResolvedValue({ healthy: true });
jest.mock("@/db/mongodb", () => ({ checkDatabaseHealth }));
jest.mock("@/lib/env", () => ({ getAppUrl: () => "https://unrelated.example" }));

import { GET } from "../route";

it("schedules daily puzzle generation in the deployed repository-root configuration", () => {
  const configuration = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "../../vercel.json"), "utf8")
  );
  expect(configuration.crons).toContainEqual({
    path: "/api/cron/generate-puzzles",
    schedule: "0 0 * * *",
  });
});

it("requests puzzle generation without publishing unrelated blog content", async () => {
  const originalFetch = global.fetch;
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-test";
  let forwardedBody: unknown;
  let forwardedUrl: unknown;
  global.fetch = jest.fn(async (_url, options) => {
    forwardedUrl = _url;
    forwardedBody = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({ success: true, puzzle: { success: true } }));
  });
  try {
    const response = await GET(
      new Request("https://rebuzzle.test/api/cron/generate-puzzles", {
        headers: { authorization: "Bearer cron-test" },
      })
    );
    expect(response.status).toBe(200);
    expect(String(forwardedUrl)).toBe("https://rebuzzle.test/api/workflows/daily-content");
    expect(forwardedBody).toMatchObject({ triggeredBy: "cron", puzzlesOnly: true });
  } finally {
    global.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
});
