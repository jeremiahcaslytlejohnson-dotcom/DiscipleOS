import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";

const router = Router();

// POST /api/push — save push subscription (scoped to current user)
router.post("/push", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const sub = req.body;

    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      res.status(400).json({ success: false, error: "Invalid push subscription" });
      return;
    }

    const deviceId =
      typeof sub.deviceId === "string" && sub.deviceId.trim()
        ? sub.deviceId.trim()
        : null;
    const previousEndpoint =
      typeof sub.previousEndpoint === "string" && sub.previousEndpoint.trim()
        ? sub.previousEndpoint.trim()
        : null;

    if (
      (sub.deviceId !== undefined &&
        (!deviceId || deviceId.length > 128)) ||
      (sub.previousEndpoint !== undefined &&
        (!previousEndpoint || previousEndpoint.length > 4096))
    ) {
      res.status(400).json({ success: false, error: "Invalid push subscription metadata" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      // Serialize ownership decisions for the same endpoint. Without this lock,
      // two accounts could both observe an unowned endpoint before either
      // inserts it, allowing the loser to delete its current device row.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${sub.endpoint}, 0))`,
      );

      // Ownership is checked before deleting any prior endpoint so a rejected
      // takeover cannot remove the caller's current working subscription.
      const [existing] = await tx
        .select({ userId: pushSubscriptionsTable.userId })
        .from(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint))
        .limit(1);

      if (existing && existing.userId !== userId) {
        return { conflict: true };
      }

      if (deviceId) {
        await tx
          .delete(pushSubscriptionsTable)
          .where(
            and(
              eq(pushSubscriptionsTable.userId, userId),
              eq(pushSubscriptionsTable.deviceId, deviceId),
              ne(pushSubscriptionsTable.endpoint, sub.endpoint),
            ),
          );
      }

      // previousEndpoint lets the first device-aware renewal clean up a legacy
      // row that predates device_id. Ownership scoping prevents cross-user
      // deletion even if a caller supplies another account's endpoint.
      if (previousEndpoint && previousEndpoint !== sub.endpoint) {
        await tx
          .delete(pushSubscriptionsTable)
          .where(
            and(
              eq(pushSubscriptionsTable.userId, userId),
              eq(pushSubscriptionsTable.endpoint, previousEndpoint),
            ),
          );
      }

      await tx
        .insert(pushSubscriptionsTable)
        .values({
          userId,
          deviceId,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        })
        .onConflictDoUpdate({
          target: pushSubscriptionsTable.endpoint,
          set: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
            ...(deviceId ? { deviceId } : {}),
          },
        });

      return { conflict: false };
    });

    if (result.conflict) {
      res.status(403).json({ success: false, error: "Endpoint already registered to another user" });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "POST /push failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to save subscription" });
  }
});

// DELETE stale push subscription
router.delete("/push/:endpoint", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const endpoint = decodeURIComponent(req.params.endpoint);
    await db
      .delete(pushSubscriptionsTable)
      .where(and(eq(pushSubscriptionsTable.endpoint, endpoint), eq(pushSubscriptionsTable.userId, userId)));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "DELETE /push failed");
    res.status(500).json({ success: false, error: err?.message || "Failed" });
  }
});

export default router;
