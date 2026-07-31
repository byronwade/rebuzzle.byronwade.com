import { expect, test } from "@playwright/test";

test.describe("Achievements", () => {
  test("API returns the full catalog including Social Butterfly", async ({ request }) => {
    const res = await request.get("/api/achievements");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.achievements.length).toBeGreaterThanOrEqual(100);

    const share = body.achievements.find(
      (a: { id: string }) => a.id === "share_first"
    );
    expect(share).toBeDefined();
    expect(share.name).toBe("Social Butterfly");

    const first = body.achievements.find(
      (a: { id: string }) => a.id === "first_steps"
    );
    expect(first).toBeDefined();
  });

  test("achievements page shell renders", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByRole("heading", { name: /Achievements/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: "Achievements" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Levels" })).toBeVisible();
  });
});
