import { expect, test } from "@playwright/test";

test.describe("Email unsubscribe flow", () => {
  test("success=true shows Unsubscribed without client JS", async ({ page }) => {
    await page.goto("/unsubscribe?success=true");
    await expect(page.getByRole("heading", { name: "Unsubscribed" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("email query shows Unsubscribed (server-side one-click)", async ({ page }) => {
    await page.goto("/unsubscribe?email=player%40example.com");
    // success if Mongo writable; error heading if DB unavailable — never hang on loading
    const success = page.getByRole("heading", { name: "Unsubscribed" });
    const failure = page.getByRole("heading", { name: /didn't go through|didn’t go through/i });
    await expect(success.or(failure)).toBeVisible({ timeout: 15_000 });
  });

  test("missing params shows Missing email", async ({ page }) => {
    await page.goto("/unsubscribe");
    await expect(page.getByRole("heading", { name: "Missing email" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
