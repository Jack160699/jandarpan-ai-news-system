import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Default ON for local reader-ds Preview verification; override with NEXT_PUBLIC_READER_DS=0.
process.env.NEXT_PUBLIC_READER_DS ??= "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        env: {
          ...process.env,
          ENABLE_E2E_AUTH: "1",
          NODE_ENV: "development",
          // Reader DS Preview flag — Phase 7 smoke/a11y need the redesign shell.
          NEXT_PUBLIC_READER_DS: process.env.NEXT_PUBLIC_READER_DS ?? "1",
          // Pulled `.env.local` may set these; keep E2E local-only and off Vercel runtime.
          VERCEL: "",
          VERCEL_ENV: "development",
        },
      },
});
