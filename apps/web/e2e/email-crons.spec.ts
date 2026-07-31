import { expect, test } from "@playwright/test";

const CRON_SECRET = process.env.CRON_SECRET || "playwright-cron-secret";

test.describe("Notification cron contracts", () => {
  test("afternoon puzzle email cron rejects missing auth", async ({ request }) => {
    const res = await request.get("/api/cron/send-notifications");
    expect(res.status()).toBe(401);
  });

  test("morning blog email cron rejects bad bearer token", async ({ request }) => {
    const res = await request.get("/api/cron/send-blog-emails", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status()).toBe(401);
  });

  test("cron accepts Bearer CRON_SECRET (may 500 without puzzle/blog data)", async ({
    request,
  }) => {
    const puzzle = await request.get("/api/cron/send-notifications", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect([200, 500]).toContain(puzzle.status());

    const blog = await request.get("/api/cron/send-blog-emails", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect([200, 500]).toContain(blog.status());
  });

  test("unsubscribe JSON endpoint is public (not 401)", async ({ request }) => {
    const res = await request.get(
      "/api/notifications/email/unsubscribe?email=e2e-player%40example.com&format=json"
    );
    expect(res.status()).not.toBe(401);
  });
});
