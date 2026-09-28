import { createECDH } from "node:crypto";

const REQUIRED_VALUES = [
  "DATABASE_URL",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "VITE_VAPID_PUBLIC_KEY",
] as const;

export type ReminderWorkerConfigCheck = {
  ok: boolean;
  issues: string[];
  checks: {
    databaseConfigured: boolean;
    vapidPublicKeyConfigured: boolean;
    vapidPrivateKeyConfigured: boolean;
    vapidSubjectConfigured: boolean;
    browserVapidPublicKeyConfigured: boolean;
    serverAndBrowserPublicKeysMatch: boolean;
    serverVapidKeyPairMatches: boolean;
  };
};

/**
 * Validate scheduled-worker configuration without returning or logging values.
 * Scheduled deployments use their own production secret set, so fail early
 * when it is incomplete or the browser/server VAPID keys do not agree.
 */
export function inspectReminderWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ReminderWorkerConfigCheck {
  const values = {
    databaseUrl: env.DATABASE_URL?.trim() ?? "",
    publicKey: env.VAPID_PUBLIC_KEY?.trim() ?? "",
    privateKey: env.VAPID_PRIVATE_KEY?.trim() ?? "",
    subject: env.VAPID_SUBJECT?.trim() ?? "",
    browserPublicKey: env.VITE_VAPID_PUBLIC_KEY?.trim() ?? "",
  };

  const issues: string[] = REQUIRED_VALUES.filter((name) => !env[name]?.trim());
  const serverAndBrowserPublicKeysMatch =
    Boolean(values.publicKey && values.browserPublicKey) &&
    values.publicKey === values.browserPublicKey;

  let serverVapidKeyPairMatches = false;
  if (values.publicKey && values.privateKey) {
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(Buffer.from(values.privateKey, "base64url"));
      const derivedPublicKey = ecdh
        .getPublicKey(undefined, "uncompressed")
        .toString("base64url");
      serverVapidKeyPairMatches = derivedPublicKey === values.publicKey;
    } catch {
      serverVapidKeyPairMatches = false;
    }
  }

  if (
    values.publicKey &&
    values.privateKey &&
    !serverVapidKeyPairMatches
  ) {
    issues.push("VAPID_PUBLIC_KEY does not match VAPID_PRIVATE_KEY");
  }
  if (
    values.publicKey &&
    values.browserPublicKey &&
    !serverAndBrowserPublicKeysMatch
  ) {
    issues.push("VITE_VAPID_PUBLIC_KEY does not match VAPID_PUBLIC_KEY");
  }

  return {
    ok: issues.length === 0,
    issues,
    checks: {
      databaseConfigured: Boolean(values.databaseUrl),
      vapidPublicKeyConfigured: Boolean(values.publicKey),
      vapidPrivateKeyConfigured: Boolean(values.privateKey),
      vapidSubjectConfigured: Boolean(values.subject),
      browserVapidPublicKeyConfigured: Boolean(values.browserPublicKey),
      serverAndBrowserPublicKeysMatch,
      serverVapidKeyPairMatches,
    },
  };
}