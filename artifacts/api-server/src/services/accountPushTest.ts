import { createHash, randomUUID } from "node:crypto";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import webpush from "web-push";

type DevicePushResult = {
  deviceKey: string;
  providerAccepted: boolean;
  statusCode?: number;
  errorName?: string;
};

export type AccountPushTestResult = {
  registrations: number;
  devices: DevicePushResult[];
};

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Missing VAPID configuration. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function safeErrorFields(error: unknown) {
  const candidate = error as {
    name?: unknown;
    statusCode?: unknown;
  } | null;

  return {
    errorName:
      typeof candidate?.name === "string" ? candidate.name : "UnknownError",
    statusCode:
      typeof candidate?.statusCode === "number"
        ? candidate.statusCode
        : undefined,
  };
}

function deviceDiagnosticKey(
  subscription: typeof pushSubscriptionsTable.$inferSelect,
): string {
  const identity = subscription.deviceId
    ? `device:${subscription.deviceId}`
    : `subscription:${subscription.id}`;
  const digest = createHash("sha256")
    .update(`${subscription.userId}:${identity}`)
    .digest("hex")
    .slice(0, 16);
  return `device_${digest}`;
}

/**
 * Sends a diagnostic push only to registrations owned by the supplied user.
 * This never records a reminder as sent and never removes a registration.
 */
export async function sendAccountScopedTestPush(
  userId: string,
): Promise<AccountPushTestResult> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  if (subscriptions.length === 0) {
    return { registrations: 0, devices: [] };
  }

  configureWebPush();
  const devices: DevicePushResult[] = [];

  for (const subscription of subscriptions) {
    const deviceKey = deviceDiagnosticKey(subscription);

    try {
      const response = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify({
          title: "DiscipleOS Test",
          body: "Account-scoped push delivery test. This is not a reminder.",
          url: "/",
          tag: `discipleos-account-test-${randomUUID()}`,
        }),
      );

      devices.push({
        deviceKey,
        providerAccepted:
          response.statusCode >= 200 && response.statusCode < 300,
        statusCode: response.statusCode,
      });
    } catch (error) {
      const failure = safeErrorFields(error);
      devices.push({
        deviceKey,
        providerAccepted: false,
        statusCode: failure.statusCode,
        errorName: failure.errorName,
      });
    }
  }

  return { registrations: subscriptions.length, devices };
}