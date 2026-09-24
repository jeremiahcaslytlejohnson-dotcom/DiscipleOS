import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @workspace/api-server run dev",
      url: "http://127.0.0.1:8080/api/healthz",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        PORT: "8080",
      },
    },
    {
      command: "pnpm run dev",
      url: "http://127.0.0.1:4173/mountain-rhythm",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: "4173",
        API_SERVER_URL: "http://127.0.0.1:8080",
      },
    },
  ],
});