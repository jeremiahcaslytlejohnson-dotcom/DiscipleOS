import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import webpush from "web-push";

const router = Router();

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

export default router;
