import { defineConfig, devices } from "@playwright/test";

/**
 * Browser e2e for achievements + notification flows.
 * Uses Next.js webServer when PLAYWRIGHT_BASE_URL is unset.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm exec next dev --turbopack -p 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          AUTH_SECRET:
            process.env.AUTH_SECRET ||
            "playwright-test-auth-secret-32chars!!",
          CRON_SECRET: process.env.CRON_SECRET || "playwright-cron-secret",
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000",
          RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "notifications@byronwade.com",
          // Allow pages that don't need a live DB; APIs are mocked in specs
          MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rebuzzle-e2e",
          // Satisfy startup env validation; specs never call real AI providers
          GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || "playwright-test-google-key",
        },
      },
});
