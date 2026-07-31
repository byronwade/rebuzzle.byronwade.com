import { expect, test } from "@playwright/test";

test.describe("Email notification settings", () => {
  test("settings page loads notification controls", async ({ page }) => {
    await page.route("**/api/auth/session**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          user: {
            id: "u1",
            email: "player@example.com",
            username: "Player",
            isGuest: false,
          },
        }),
      });
    });

    await page.route("**/api/notifications/email/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          enabled: true,
          email: "player@example.com",
        }),
      });
    });

    await page.goto("/settings");
    await expect(page.getByText(/email|notification/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
