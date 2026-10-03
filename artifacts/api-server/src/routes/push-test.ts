import { Router } from "express";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import webpush from "web-push";
import { createHash } from "node:crypto";
import { sendAccountScopedTestPush } from "../services/accountPushTest";

const router = Router();
const ACCOUNT_SCOPED_TEST_EMAIL = "manandhismountain@gmail.com";

function userDiagnosticKey(userId: string): string {
  return `user_${createHash("sha256").update(userId).digest("hex").slice(0, 16)}`;
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Missing VAPID env vars (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

// POST /api/push/test — send a test push to all stored subscriptions (CRON_SECRET required)
router.post("/push/test", async (req, res) => {
  const secret = req.headers["x-cron-secret"] || req.query["secret"];
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    configureWebPush();

    const subscriptions = await db.select().from(pushSubscriptionsTable);

    if (!subscriptions.length) {
      res.json({ success: true, sent: 0, message: "No push subscriptions found" });
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "DiscipleOS Test",
            body: "This is a live test push from DiscipleOS.",
            url: "/",
            tag: `discipleos-test-${Date.now()}`,
          })
        );
        sent++;
      } catch (err: any) {
        failed++;
        req.log.warn({ err, endpoint: sub.endpoint }, "Test push failed");
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        }
      }
    }

    res.json({ success: true, subscriptions: subscriptions.length, sent, failed });
  } catch (err: any) {
    req.log.error({ err }, "POST /push/test failed");
    res.status(500).json({ success: false, error: err?.message || "Failed" });
  }
});

// POST /api/push/test/account-scoped — diagnostic test for the one named account.
// This route intentionally accepts no target from the request and has no global fallback.
router.post("/push/test/account-scoped", async (req, res) => {
  const secret = req.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const body = req.body;
  if (
    body !== undefined &&
    body !== null &&
    (typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length > 0)
  ) {
    res.status(400).json({
      success: false,
      error: "This test has a fixed account target and accepts no target override.",
    });
    return;
  }

  try {
    const matchingUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${ACCOUNT_SCOPED_TEST_EMAIL}`)
      .limit(2);

    if (matchingUsers.length === 0) {
      res.status(404).json({
        success: false,
        outcome: "account_not_found",
        message: "Target account was not found; no notifications were sent.",
      });
      return;
    }

    if (matchingUsers.length !== 1) {
      res.status(409).json({
        success: false,
        outcome: "account_ambiguous",
        message: "Target account matched multiple records; no notifications were sent.",
      });
      return;
    }

    const target = matchingUsers[0];
    const result = await sendAccountScopedTestPush(target.id);
    if (result.registrations === 0) {
      res.status(409).json({
        success: false,
        outcome: "no_registrations",
        registrations: 0,
        devices: [],
        message: "Target account has no registered devices; no notifications were sent.",
      });
      return;
    }

    const accepted = result.devices.filter(
      (device) => device.providerAccepted,
    ).length;
    req.log.info(
      {
        event: "account_scoped_push_test_completed",
        targetUserKey: userDiagnosticKey(target.id),
        registrations: result.registrations,
        providerAccepted: accepted,
        failed: result.devices.length - accepted,
      },
      "Account-scoped push test completed",
    );
    res.json({
      success: accepted === result.registrations,
      outcome: "completed",
      scope: "one_account",
      registrations: result.registrations,
      providerAccepted: accepted,
      failed: result.devices.length - accepted,
      devices: result.devices,
    });
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      statusCode?: unknown;
    } | null;
    req.log.error(
      {
        event: "account_scoped_push_test_failed",
        errorName:
          typeof candidate?.name === "string"
            ? candidate.name
            : "UnknownError",
        statusCode:
          typeof candidate?.statusCode === "number"
            ? candidate.statusCode
            : undefined,
      },
      "Account-scoped push test failed",
    );
    res.status(500).json({
      success: false,
      error: "Account-scoped push test failed before completion.",
    });
  }
});

export default router;
