import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: [],
    env: {
      SESSION_SECRET: "test-secret-for-isolation-tests",
      NODE_ENV: "test",
      // Test VAPID credentials — not real keys, only used so configureWebPush()
      // does not throw "Missing VAPID env vars" when web-push is mocked.
      VAPID_PUBLIC_KEY: "BTest_PublicKey_NotReal_ForTestsOnly_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      VAPID_PRIVATE_KEY: "Test_PrivateKey_NotReal_AAAAAAAAAAAAAAAAAAAAAA",
      VAPID_SUBJECT: "mailto:test@discipleos.example",
      CRON_SECRET: "test-cron-secret-for-push-tests",
    },
  },
});
