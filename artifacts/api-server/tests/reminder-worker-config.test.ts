import { createECDH } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectReminderWorkerConfig } from "../src/jobs/reminderWorkerConfig";

function makeVapidPair() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey("base64url", "uncompressed"),
    privateKey: ecdh.getPrivateKey("base64url"),
  };
}

describe("scheduled reminder worker configuration", () => {
  it("requires a single valid one-minute cron deployment", () => {
    const config = readFileSync(new URL("../../../.replit", import.meta.url), "utf8");

    expect(config.match(/^\[\[deployment\.scheduled\]\]$/gm)).toHaveLength(1);
    expect(config).toContain('schedule = "* * * * *"');
    expect(config).toContain('run = "bash scripts/run-reminder-scheduled-job.sh"');
    expect(config).not.toContain('schedule = "every 1 minute"');
  });

  it("accepts a matching server/browser VAPID key pair without returning values", () => {
    const pair = makeVapidPair();
    const fixtureDatabaseUrl = "postgresql://fixture.invalid/reminder-tests";
    const check = inspectReminderWorkerConfig({
      DATABASE_URL: fixtureDatabaseUrl,
      VAPID_PUBLIC_KEY: pair.publicKey,
      VAPID_PRIVATE_KEY: pair.privateKey,
      VAPID_SUBJECT: "mailto:reminders@example.invalid",
      VITE_VAPID_PUBLIC_KEY: pair.publicKey,
    });

    expect(check).toMatchObject({
      ok: true,
      checks: {
        databaseConfigured: true,
        serverAndBrowserPublicKeysMatch: true,
        serverVapidKeyPairMatches: true,
      },
      issues: [],
    });
    expect(JSON.stringify(check)).not.toContain(fixtureDatabaseUrl);
    expect(JSON.stringify(check)).not.toContain(pair.privateKey);
    expect(JSON.stringify(check)).not.toContain(pair.publicKey);
  });

  it("rejects mismatched VAPID keys without exposing their values", () => {
    const serverPair = makeVapidPair();
    const browserPair = makeVapidPair();
    const check = inspectReminderWorkerConfig({
      DATABASE_URL: "postgresql://fixture.invalid/reminder-tests",
      VAPID_PUBLIC_KEY: serverPair.publicKey,
      VAPID_PRIVATE_KEY: serverPair.privateKey,
      VAPID_SUBJECT: "mailto:reminders@example.invalid",
      VITE_VAPID_PUBLIC_KEY: browserPair.publicKey,
    });

    expect(check.ok).toBe(false);
    expect(check.checks.serverVapidKeyPairMatches).toBe(true);
    expect(check.checks.serverAndBrowserPublicKeysMatch).toBe(false);
    expect(check.issues).toContain(
      "VITE_VAPID_PUBLIC_KEY does not match VAPID_PUBLIC_KEY",
    );
    expect(JSON.stringify(check)).not.toContain(serverPair.privateKey);
    expect(JSON.stringify(check)).not.toContain(serverPair.publicKey);
    expect(JSON.stringify(check)).not.toContain(browserPair.publicKey);
  });
});