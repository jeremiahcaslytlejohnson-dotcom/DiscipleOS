import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/push — save push subscription
router.post("/push", async (req, res) => {
  try {
    const sub = req.body;

    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      res.status(400).json({ success: false, error: "Invalid push subscription" });
      return;
    }

    await db
      .insert(pushSubscriptionsTable)
      .values({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      });

    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "POST /push failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to save subscription" });
  }
});

// DELETE stale push subscription
router.delete("/push/:endpoint", async (req, res) => {
  try {
    const endpoint = decodeURIComponent(req.params.endpoint);
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "DELETE /push failed");
    res.status(500).json({ success: false, error: err?.message || "Failed" });
  }
});

export default router;
