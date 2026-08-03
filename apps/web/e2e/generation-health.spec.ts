import { expect, test } from "@playwright/test";

/**
 * Backend contract E2E for generation observability.
 * Does not invent puzzles live — it proves the admin health surface stays wired
 * so operators can verify reject modes / audits in production.
 */
test.describe("Generation health API contract", () => {
  test("rejects anonymous access", async ({ request }) => {
    const response = await request.get("/api/admin/ai/generation-health");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/admin/i);
  });
});
