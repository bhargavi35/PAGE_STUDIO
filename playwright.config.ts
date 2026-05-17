import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config.
 *
 * - We start a real Next.js prod server (build + start) so a11y results
 *   match what users actually receive. Dev mode would add HMR overlays that
 *   confuse axe.
 * - One browser (Chromium) by default for CI speed; add WebKit / Firefox
 *   projects below if cross-browser regressions ever bite.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // localStorage / release writes are not isolated between tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start -- -p 3000",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
