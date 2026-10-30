import { expect, test } from "@playwright/test";

test.describe("Extended daily solving", () => {
  test("daily answer reveal is an authenticated action", async ({ request }) => {
    const response = await request.post("/api/puzzles/reveal", {
      data: { puzzleId: "today" },
    });

    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("restores a score-locked board and lets the player solve without leaking the answer", async ({
    page,
  }) => {
    const restoredSession = {
      success: true,
      puzzleId: "e2e-extended-daily",
      puzzleDate: "2026-10-27",
      attempts: [1, 2, 3].map((attemptNumber) => ({
        guess: `idea ${attemptNumber}`,
        correct: false,
        attemptNumber,
      })),
      hintsUsed: 0,
      attemptsLeft: 0,
      maxAttempts: 3,
      gameOver: false,
      wasSuccessful: false,
      phase: "score_locked",
      scoreLocked: true,
      playMode: "extended",
    };
    let restorePayload: typeof restoredSession | null = null;
    let guessPayload: Record<string, unknown> | null = null;

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/auth/session") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            authenticated: true,
            user: {
              id: "e2e-player",
              email: "player@example.com",
              username: "Player",
              isGuest: false,
            },
          }),
        });
        return;
      }
      if (pathname === "/api/puzzle/session") {
        restorePayload = restoredSession;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(restoredSession),
        });
        return;
      }
      if (pathname === "/api/puzzles/guess") {
        guessPayload = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            correct: true,
            wasSuccessful: true,
            phase: "solved",
            scoreLocked: true,
            playMode: "extended",
            attemptNumber: 4,
            attemptsLeft: 0,
            maxAttempts: 3,
            gameOver: true,
            locked: true,
            wordResults: [],
            answer: "BEFORE",
            explanation: "Bee + four sounds like before.",
            pointsEarned: 0,
            streak: 1,
          }),
        });
        return;
      }
      if (pathname === "/api/puzzles/quip") {
        await route.fulfill({ status: 200, contentType: "text/plain", body: "A clever connection." });
        return;
      }
      if (pathname === "/api/user/stats") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            stats: { points: 0, streak: 0, maxStreak: 0, totalGames: 0, wins: 0, level: 1 },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, solves: [], percentiles: [] }),
      });
    });

    await page.goto("/?test=extended-daily");

    await expect(page.getByTestId("scoreLockedCard")).toBeVisible();
    expect(restorePayload).toMatchObject({ phase: "score_locked", scoreLocked: true });
    expect(JSON.stringify(restorePayload)).not.toContain("BEFORE");
    await expect(page.getByText("BEFORE", { exact: true })).toHaveCount(0);

    await page.getByTestId("continueSolving").click();
    await page.getByRole("textbox", { name: "Your answer" }).fill("before");
    await page.getByRole("button", { name: "Submit answer" }).click();

    await expect.poll(() => guessPayload).toMatchObject({
      puzzleId: "e2e-extended-daily",
      guess: "before",
      playMode: "extended",
    });
    await expect(page.getByText("Solved", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "The scored round ended after three guesses. This solve still counts toward your streak.",
        { exact: true }
      )
    ).toBeVisible();
  });

  test("uses a concurrent winning continuation returned by the reveal endpoint", async ({ page }) => {
    const restoredSession = {
      success: true,
      puzzleId: "e2e-extended-daily",
      puzzleDate: "2026-10-27",
      attempts: [1, 2, 3].map((attemptNumber) => ({
        guess: `idea ${attemptNumber}`,
        correct: false,
        attemptNumber,
      })),
      hintsUsed: 0,
      attemptsLeft: 0,
      maxAttempts: 3,
      gameOver: false,
      wasSuccessful: false,
      phase: "score_locked",
      scoreLocked: true,
      playMode: "extended",
    };

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/auth/session") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            authenticated: true,
            user: {
              id: "e2e-player",
              email: "player@example.com",
              username: "Player",
              isGuest: false,
            },
          }),
        });
        return;
      }
      if (pathname === "/api/puzzle/session") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(restoredSession),
        });
        return;
      }
      if (pathname === "/api/puzzles/reveal") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            puzzleId: "e2e-extended-daily",
            phase: "solved",
            scoreLocked: true,
            correct: true,
            wasSuccessful: true,
            gameOver: true,
            attempts: [
              ...restoredSession.attempts,
              { guess: "before", correct: true, attemptNumber: 4 },
            ],
            answer: "BEFORE",
            explanation: "Bee + four sounds like before.",
            pointsEarned: 0,
          }),
        });
        return;
      }
      if (pathname === "/api/puzzles/quip") {
        await route.fulfill({ status: 200, contentType: "text/plain", body: "A clever connection." });
        return;
      }
      if (pathname === "/api/user/stats") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            stats: { points: 0, streak: 0, maxStreak: 0, totalGames: 0, wins: 0, level: 1 },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, solves: [], percentiles: [] }),
      });
    });

    await page.goto("/?test=extended-daily");
    await expect(page.getByTestId("scoreLockedCard")).toBeVisible();
    await page.getByTestId("continueSolving").click();
    await page.getByTestId("revealAnswer").click();

    await expect(page.getByText("before", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /full results/i })).toHaveAttribute(
      "href",
      /guess=before.*attempts=4/
    );
  });
});
