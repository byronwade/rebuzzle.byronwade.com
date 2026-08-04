import { expect, test } from "@playwright/test";

/**
 * Studio UGC + Eve review surface contracts.
 * No invent spend and no authenticated Mongo writes — proves public pages and
 * auth gates stay wired for Studio, community, creators, and Eve review APIs.
 */
test.describe("Studio UGC public surfaces", () => {
  test("studio page loads guest CTA with brand-first Studio signal", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByText("Studio", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create a free account|log in to open studio/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /browse player puzzles/i })).toBeVisible();
  });

  test("community index loads", async ({ page }) => {
    await page.goto("/community");
    await expect(page.getByRole("heading", { name: /player puzzles/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: /open studio|make a puzzle/i }).first()).toBeVisible();
  });

  test("studio is linked from the site chrome", async ({ page }) => {
    await page.goto("/");
    const studio = page.getByRole("link", { name: /^studio$/i }).first();
    await expect(studio).toBeVisible({ timeout: 15_000 });
    await studio.click();
    await expect(page).toHaveURL(/\/studio/);
  });
});

test.describe("Studio API auth contracts", () => {
  test("catalog rejects anonymous access", async ({ request }) => {
    const response = await request.get("/api/studio/catalog");
    expect([401, 403]).toContain(response.status());
  });

  test("submissions list rejects anonymous access", async ({ request }) => {
    const response = await request.get("/api/studio/submissions");
    expect([401, 403]).toContain(response.status());
  });

  test("submissions save rejects anonymous access", async ({ request }) => {
    const response = await request.post("/api/studio/submissions", {
      data: {
        answer: "sunflower",
        explanation: "Sun plus flower reads as sunflower for the compound board.",
        hints: ["compound", "garden", "yellow"],
        techniqueId: "simple_compound",
        difficulty: 4,
        layers: [{ kind: "text", content: "SUN", emphasis: "normal" }],
        submit: false,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("Eve review rejects anonymous access", async ({ request }) => {
    const response = await request.post("/api/studio/review", {
      data: {
        answer: "sunflower",
        explanation: "Sun plus flower reads as sunflower for the compound board.",
        hints: ["compound", "garden", "yellow"],
        techniqueId: "simple_compound",
        difficulty: 4,
        layers: [{ kind: "text", content: "SUN", emphasis: "normal" }],
        sync: true,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("Eve review rejects empty anonymous payloads", async ({ request }) => {
    const response = await request.post("/api/studio/review", {
      data: { sync: true },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test("creator API returns structured empty/not-found for unknown handles", async ({
    request,
  }) => {
    const response = await request.get("/api/creators/this-user-should-not-exist-zz9");
    expect([404, 200]).toContain(response.status());
    if (response.status() === 200) {
      const body = (await response.json()) as { puzzles?: unknown[] };
      expect(Array.isArray(body.puzzles)).toBe(true);
      expect(body.puzzles?.length ?? 0).toBe(0);
    }
  });
});

test.describe("Community / creator hard edges", () => {
  test("unknown community puzzle uses not-found metadata title", async ({ page }) => {
    await page.goto("/community/puzzles/does-not-exist-slug-zz9");
    await expect(page).toHaveTitle(/community puzzle|not found/i);
  });

  test("unknown creator profile uses not-found metadata title", async ({ page }) => {
    await page.goto("/u/this-user-should-not-exist-zz9");
    await expect(page).toHaveTitle(/creator not found|not found/i);
  });
});
