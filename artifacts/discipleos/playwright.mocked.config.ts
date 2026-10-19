import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4175",
    trace: "on",
  },
  webServer: {
    command: "pnpm run dev -- --port 4175",
    url: "http://127.0.0.1:4175/mountain-rhythm",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: "4175",
      BASE_PATH: "/",
    },
  },
});
