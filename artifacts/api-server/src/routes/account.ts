import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, eventsTable, pushSubscriptionsTable, readingPlansTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const RESET_TEMPLATE_KEYS = new Set([
  "20-day-reset",
  "20-day-consistency-reset",
]);
const RESET_NAMES = new Set([
  "20-Day Reset",
  "20-Day Consistency Reset",
]);
const RETIRED_RESET_PLAN_IDS = new Set([
  "plan-30day-consistency-reset",
  "discipleos-30-day-reset",
]);
const RETIRED_RESET_TEMPLATE_KEYS = new Set([
  "30-day-consistency-reset",
]);
const RETIRED_RESET_NAMES = new Set([
  "30-Day Consistency Reset",
  "30 Day Consistency Reset",
  "Legacy 30-Day Reset",
]);

function isResetPlan(plan: {
  id: string;
  templateKey: string | null;
  data: unknown;
}) {
  const data = plan.data as { templateKey?: unknown; name?: unknown } | null;
  const name = data && typeof data.name === "string" ? data.name : "";
  return (
    RESET_TEMPLATE_KEYS.has(plan.templateKey || "") ||
    RESET_TEMPLATE_KEYS.has(String(data?.templateKey || "")) ||
    RESET_NAMES.has(name)
  );
}

function isRetiredResetPlan(plan: {
  id: string;
  templateKey: string | null;
  data: unknown;
}) {
  const data = plan.data as { templateKey?: unknown; name?: unknown } | null;
  const name = data && typeof data.name === "string" ? data.name : "";
  return (
    RETIRED_RESET_PLAN_IDS.has(plan.id) ||
    RETIRED_RESET_TEMPLATE_KEYS.has(plan.templateKey || "") ||
    RETIRED_RESET_TEMPLATE_KEYS.has(String(data?.templateKey || "")) ||
    RETIRED_RESET_NAMES.has(name)
  );
}
function isResetComplete(data: unknown) {
  const plan = (data || {}) as {
    assignments?: Array<{ readings?: Array<{ key?: string }> }>;
    completed?: Record<string, boolean>;
    completedChapterKeys?: string[];
  };
  const completed =
    plan.completed && typeof plan.completed === "object"
      ? plan.completed
      : new Set(plan.completedChapterKeys || []);
  const assignments = Array.isArray(plan.assignments) ? plan.assignments : [];
  return (
    assignments.length > 0 &&
    assignments.every(
      (assignment) =>
        Array.isArray(assignment.readings) &&
        assignment.readings.length > 0 &&
        assignment.readings.every((reading) =>
          completed instanceof Set ? completed.has(reading.key || "") : completed[reading.key || ""] === true,
        ),
    )
  );
}

/**
 * Moves records created by the current anonymous browser session to the account
 * that is signing in. This is intentionally session-bound: no other browser can
 * claim data it did not create.
 */
router.post("/account/claim", requireAuth, async (req, res) => {
  const accountUserId = req.dbUser!.id;

  const anonymousUserId = req.session.anonymousUserId;
  if (!anonymousUserId || anonymousUserId === accountUserId) {
    req.session.sessionEstablished = true;
    res.json({ success: true, claimed: { events: 0, plans: 0, subscriptions: 0 } });
    return;
  }

  try {
    const claimed = await db.transaction(async (tx) => {
      const anonymousEvents = await tx
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.userId, anonymousUserId));
      const anonymousPlans = (await tx
        .select()
        .from(readingPlansTable)
        .where(eq(readingPlansTable.userId, anonymousUserId)))
        .filter((plan) => !isRetiredResetPlan(plan));
      const anonymousSubscriptions = await tx
        .select()
        .from(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.userId, anonymousUserId));
      const accountPlans = await tx
        .select()
        .from(readingPlansTable)
        .where(eq(readingPlansTable.userId, accountUserId));
      const activeAnonymousResets = anonymousPlans.filter(
        (plan) => isResetPlan(plan) && !isResetComplete(plan.data),
      );
      const accountHasActiveReset = accountPlans.some(
        (plan) => isResetPlan(plan) && !isResetComplete(plan.data),
      );
      if (activeAnonymousResets.length > 1 || (activeAnonymousResets.length > 0 && accountHasActiveReset)) {
        throw Object.assign(new Error("An active Consistency Reset already exists"), { status: 409 });
      }

      let events = 0;
      for (const event of anonymousEvents) {
        const [accountEvent] = await tx
          .select()
          .from(eventsTable)
          .where(and(eq(eventsTable.id, event.id), eq(eventsTable.userId, accountUserId)))
          .limit(1);

        if (accountEvent) {
          if ((event.updatedAt?.getTime() ?? 0) > (accountEvent.updatedAt?.getTime() ?? 0)) {
            await tx.update(eventsTable).set({ ...event, userId: accountUserId }).where(eq(eventsTable.id, event.id));
          }
        } else {
          await tx.update(eventsTable).set({ userId: accountUserId }).where(eq(eventsTable.id, event.id));
          events++;
        }
      }

      let plans = 0;
      for (const plan of anonymousPlans) {
        const targetPlanId = plan.id;
        const nextPlanData = plan.data;

        const [accountPlan] = await tx
          .select()
          .from(readingPlansTable)
          .where(and(eq(readingPlansTable.id, targetPlanId), eq(readingPlansTable.userId, accountUserId)))
          .limit(1);

        if (accountPlan) {
          if ((plan.updatedAt?.getTime() ?? 0) > (accountPlan.updatedAt?.getTime() ?? 0)) {
            await tx.update(readingPlansTable).set({
              data: nextPlanData,
              templateKey: plan.templateKey,
              updatedAt: plan.updatedAt,
            }).where(eq(readingPlansTable.id, targetPlanId));
          }
        } else {
          await tx.update(readingPlansTable).set({
            id: targetPlanId,
            userId: accountUserId,
            data: nextPlanData,
            templateKey: plan.templateKey,
          }).where(and(eq(readingPlansTable.id, plan.id), eq(readingPlansTable.userId, anonymousUserId)));
          plans++;
        }
      }

      let subscriptions = 0;
      for (const subscription of anonymousSubscriptions) {
        const [accountSubscription] = await tx
          .select()
          .from(pushSubscriptionsTable)
          .where(and(eq(pushSubscriptionsTable.endpoint, subscription.endpoint), eq(pushSubscriptionsTable.userId, accountUserId)))
          .limit(1);

        if (!accountSubscription) {
          if (subscription.deviceId) {
            // The current browser's anonymous subscription supersedes any
            // older account-owned endpoint for the same device.
            await tx
              .delete(pushSubscriptionsTable)
              .where(
                and(
                  eq(pushSubscriptionsTable.userId, accountUserId),
                  eq(pushSubscriptionsTable.deviceId, subscription.deviceId),
                ),
              );
          }
          await tx
            .update(pushSubscriptionsTable)
            .set({ userId: accountUserId })
            .where(eq(pushSubscriptionsTable.id, subscription.id));
          subscriptions++;
        }
      }

      return { events, plans, subscriptions };
    });

    req.session.sessionEstablished = true;
    res.json({ success: true, claimed });
  } catch (err: any) {
    req.log.error({ err }, "POST /account/claim failed");
    res.status(err?.status === 409 ? 409 : 500).json({
      success: false,
      error: err?.message || "Could not claim existing data",
    });
  }
});

export default router;