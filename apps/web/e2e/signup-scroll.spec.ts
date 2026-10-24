import { expect, test } from "@playwright/test";

test.describe("Signup and scrolling pages", () => {
  test.use({ viewport: { width: 390, height: 667 } });

  test("create account page scrolls on a narrow viewport", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible({
      timeout: 15_000,
    });

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        scrollHeight: root.scrollHeight,
        clientHeight: root.clientHeight,
        rootOverflow: root.style.overflow,
        bodyOverflow: document.body.style.overflow,
      };
    });

    expect(metrics.rootOverflow).not.toBe("hidden");
    expect(metrics.bodyOverflow).not.toBe("hidden");
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 500);
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(40);
  });

  test("leftover game-page overflow lock is cleared on a scrolling route", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.evaluate(() => {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    });

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible({
      timeout: 15_000,
    });

    const overflow = await page.evaluate(() => ({
      root: document.documentElement.style.overflow,
      body: document.body.style.overflow,
      overscroll: document.body.style.overscrollBehavior,
    }));

    expect(overflow.root).not.toBe("hidden");
    expect(overflow.body).not.toBe("hidden");
    expect(overflow.overscroll).not.toBe("none");
  });
});
