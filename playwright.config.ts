import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test configuration for Immo2025.
 *
 * Two profiles:
 *   npm run test:e2e          → local dev server (localhost:3000)
 *   npm run test:e2e:prod     → production (tiili.io)
 */

const isProd = process.env.TEST_ENV === "prod";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: isProd ? 2 : 0,
  workers: isProd ? 2 : undefined,
  reporter: "html",
  timeout: isProd ? 30_000 : 15_000,

  use: {
    baseURL: isProd ? "https://tiili.io" : "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        isMobile: true,
      },
    },
  ],

  // Only start local dev server when not testing prod
  ...(!isProd && {
    webServer: {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  }),
});
