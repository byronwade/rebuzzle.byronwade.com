import { expect, test } from "@playwright/test";

/**
 * Retention surface contracts — no invent spend.
 * Proves inbox + reminder APIs stay gated for anonymous users.
 */
test.describe("Retention notification contracts", () => {
  test("in-app inbox rejects anonymous access", async ({ request }) => {
    const response = await request.get("/api/notifications/in-app");
    expect(response.status()).toBe(401);
  });

  test("user stats rejects anonymous access", async ({ request }) => {
    const response = await request.get("/api/user/stats");
    expect(response.status()).toBe(401);
  });
});
