import { Router } from "express";
import { db } from "@workspace/db";
import { readingPlansTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  canStartNamedJourney,
  getNamedJourneyDuration,
} from "../auth/capabilities";

const router = Router();

const CURRENT_RESET_TEMPLATE_KEYS = new Set([
  "20-day-reset",
  "20-day-consistency-reset",
]);
const CURRENT_RESET_NAMES = new Set([
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
const STRUCTURED_JOURNEY_KEYS = new Set([
  "7-day-climb",
  "20-day-reset",
  "40-day-climb",
]);

function normalizePlan(plan: any) {
  const name = typeof plan?.name === "string" ? plan.name.trim() : "";
  const templateKey = typeof plan?.templateKey === "string" ? plan.templateKey.trim() : "";
  if (
    CURRENT_RESET_TEMPLATE_KEYS.has(templateKey) ||
    CURRENT_RESET_NAMES.has(name) ||
    plan?.journeyKey === "20-day-reset" ||
    plan?.journeyType === "20-day-reset"
  ) {
    return { ...plan, name: "20-Day Reset", templateKey: "20-day-reset" };
  }
  return plan;
}

function isRetiredResetPlan(plan: any) {
  const name = typeof plan?.name === "string" ? plan.name.trim() : "";
  const templateKey = typeof plan?.templateKey === "string" ? plan.templateKey.trim() : "";
  return (
    RETIRED_RESET_PLAN_IDS.has(plan?.id) ||
    RETIRED_RESET_TEMPLATE_KEYS.has(templateKey) ||
    RETIRED_RESET_TEMPLATE_KEYS.has(String(plan?.templateKey || "")) ||
    RETIRED_RESET_NAMES.has(name)
  );
}

function isResetPlan(plan: any) {
  const name = typeof plan?.name === "string" ? plan.name.trim() : "";
  return (
    CURRENT_RESET_TEMPLATE_KEYS.has(plan?.templateKey) ||
    CURRENT_RESET_NAMES.has(name) ||
    plan?.journeyKey === "20-day-reset" ||
    plan?.journeyType === "20-day-reset"
  );
}

function isResetComplete(plan: any) {
  const completed =
    plan?.completed && typeof plan.completed === "object" && !Array.isArray(plan.completed)
      ? plan.completed
      : new Set(Array.isArray(plan?.completedChapterKeys) ? plan.completedChapterKeys : []);
  const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];
  return (
    assignments.length > 0 &&
    assignments.every(
      (assignment: any) =>
        Array.isArray(assignment.readings) &&
        assignment.readings.length > 0 &&
        assignment.readings.every((reading: any) =>
          completed instanceof Set ? completed.has(reading.key) : completed[reading.key] === true,
        ),
    )
  );
}

function getStructuredJourneyKey(plan: any) {
  const journeyKey = plan?.journeyKey || plan?.journeyType;
  if (STRUCTURED_JOURNEY_KEYS.has(journeyKey)) return journeyKey;
  if (
    plan?.templateKey === "20-day-reset" ||
    plan?.templateKey === "20-day-consistency-reset" ||
    plan?.name === "20-Day Reset" ||
    plan?.name === "20-Day Consistency Reset"
  ) {
    return "20-day-reset";
  }
  return null;
}

function isStructuredClimb(plan: any) {
  return Boolean(getStructuredJourneyKey(plan));
}

// GET /api/reading/plans — returns only the current user's plans
router.get("/reading/plans", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const rows = await db
      .select()
      .from(readingPlansTable)
      .where(eq(readingPlansTable.userId, userId))
      .orderBy(readingPlansTable.updatedAt);
    const plans = rows
      .map((r) => {
      const plan = r.data as Record<string, unknown>;
      return normalizePlan({
        ...plan,
        id: plan.id || r.id,
        templateKey: r.templateKey || plan.templateKey,
      });
      })
      .filter((plan) => !isRetiredResetPlan(plan));
    res.json({ success: true, plans });
  } catch (err: any) {
    req.log.error({ err }, "GET /reading/plans failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to load plans" });
  }
});

// POST /api/reading/plans — upsert (scoped to current user)
router.post("/reading/plans", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const plan = normalizePlan(req.body);
    if (!plan?.id) {
      res.status(400).json({ success: false, error: "Missing plan id" });
      return;
    }
    if (isRetiredResetPlan(plan)) {
      res.status(410).json({ success: false, error: "The 30-Day Reset is no longer available" });
      return;
    }
    if (
      isResetPlan(plan) &&
      !plan.journeyKey &&
      !plan.journeyType
    ) {
      res.status(403).json({ success: false, error: "20-Day Reset is currently locked" });
      return;
    }

    const namedJourneyDuration = getNamedJourneyDuration(
      plan.journeyKey || plan.journeyType,
    );
    if (plan.journeyKey && !namedJourneyDuration) {
      res.status(400).json({ success: false, error: "Unknown reading journey" });
      return;
    }
    if (namedJourneyDuration) {
      if (!canStartNamedJourney(req, plan.journeyKey || plan.journeyType)) {
            const lockedJourneyLabel = plan.journeyKey === "20-day-reset"
              ? "20-Day Reset"
              : "40-Day Climb";
            res.status(403).json({ success: false, error: `${lockedJourneyLabel} is currently locked` });
        return;
      }
      if (
        plan.journeyType !== plan.journeyKey ||
        plan.journeyDays !== namedJourneyDuration ||
        plan.durationDays !== namedJourneyDuration ||
        plan.totalDays !== namedJourneyDuration ||
        !Array.isArray(plan.assignments) ||
        plan.assignments.length !== namedJourneyDuration
      ) {
        res.status(400).json({ success: false, error: "Named journey metadata does not match its duration" });
        return;
      }
    }

    // Check ownership before update
    const [existing] = await db
      .select({ id: readingPlansTable.id, userId: readingPlansTable.userId })
      .from(readingPlansTable)
      .where(and(eq(readingPlansTable.id, plan.id), eq(readingPlansTable.userId, userId)))
      .limit(1);

    const [anyExisting] = await db
      .select({ id: readingPlansTable.id })
      .from(readingPlansTable)
      .where(eq(readingPlansTable.id, plan.id))
      .limit(1);

    if (anyExisting && !existing) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    let planToStore = plan;
    await db.transaction(async (tx) => {
      const [currentPlan] = await tx
        .select({ data: readingPlansTable.data })
        .from(readingPlansTable)
        .where(and(eq(readingPlansTable.id, plan.id), eq(readingPlansTable.userId, userId)))
        .limit(1);
      const currentData = currentPlan?.data as Record<string, unknown> | undefined;
      if (currentData) {
        const existingEarnedDayKeys = Array.isArray(currentData.earnedDayKeys)
          ? currentData.earnedDayKeys.filter((date): date is string => typeof date === "string")
          : [];
        const incomingEarnedDayKeys = Array.isArray(plan.earnedDayKeys)
          ? plan.earnedDayKeys.filter((date: unknown): date is string => typeof date === "string")
          : [];
        const existingCompletionDates =
          currentData.dayCompletionDates &&
          typeof currentData.dayCompletionDates === "object" &&
          !Array.isArray(currentData.dayCompletionDates)
            ? currentData.dayCompletionDates
            : {};
        const incomingCompletionDates =
          plan.dayCompletionDates &&
          typeof plan.dayCompletionDates === "object" &&
          !Array.isArray(plan.dayCompletionDates)
            ? plan.dayCompletionDates
            : {};
        const earnedDayKeys = [
          ...new Set([...existingEarnedDayKeys, ...incomingEarnedDayKeys]),
        ];
        const dayCompletionDates = {
          ...existingCompletionDates,
          ...incomingCompletionDates,
        };
        planToStore = {
          ...plan,
          ...(earnedDayKeys.length > 0 ? { earnedDayKeys } : {}),
          ...(Object.keys(dayCompletionDates).length > 0
            ? { dayCompletionDates }
            : {}),
        };
      }

      if (isStructuredClimb(plan) && !isResetComplete(plan)) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${"structured-climb:" + userId}, 0))`,
        );
        const existingPlans = await tx
          .select({ id: readingPlansTable.id, data: readingPlansTable.data, templateKey: readingPlansTable.templateKey })
          .from(readingPlansTable)
          .where(eq(readingPlansTable.userId, userId));
        const anotherActiveClimb = existingPlans.find((row) => {
          if (row.id === plan.id) return false;
          const rowPlan = normalizePlan({ ...(row.data as Record<string, unknown>), id: row.id, templateKey: row.templateKey });
          return isStructuredClimb(rowPlan) && !isResetComplete(rowPlan);
        });
        if (anotherActiveClimb) {
          const otherPlan = normalizePlan({
            ...(anotherActiveClimb.data as Record<string, unknown>),
            id: anotherActiveClimb.id,
            templateKey: anotherActiveClimb.templateKey,
          });
          const otherJourneyKey = getStructuredJourneyKey(otherPlan);
          const message =
            otherJourneyKey === "20-day-reset"
              ? "A 20-Day Reset is already active"
              : "A structured climb is already active";
          throw Object.assign(new Error(message), { status: 409 });
        }
      }

      await tx
        .insert(readingPlansTable)
        .values({
          id: plan.id,
          userId,
          templateKey: planToStore.templateKey || null,
          data: planToStore,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: readingPlansTable.id,
          set: {
            templateKey: planToStore.templateKey || null,
            data: planToStore,
            updatedAt: new Date(),
          },
        });
    });

    // Mark session as established — server state is now authoritative for this session
    if (!req.session.sessionEstablished) {
      req.session.sessionEstablished = true;
    }

    res.json({ success: true, plan: planToStore });
  } catch (err: any) {
    req.log.error({ err }, "POST /reading/plans failed");
    res.status(err?.status === 409 ? 409 : 500).json({ success: false, error: err?.message || "Failed to save plan" });
  }
});

// DELETE /api/reading/plans — only deletes the current user's plan
router.delete("/reading/plans", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ success: false, error: "Missing plan id" });
      return;
    }
    await db.delete(readingPlansTable).where(
      and(eq(readingPlansTable.id, id), eq(readingPlansTable.userId, userId))
    );
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "DELETE /reading/plans failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to delete plan" });
  }
});

// POST /api/reading/complete — scope to current user's plan
router.post("/reading/complete", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { planId, key, completed, earnedDay, completionDate } = req.body;
    if (!planId || !key) {
      res.status(400).json({ success: false, error: "Missing planId or key" });
      return;
    }

    const value = Boolean(completed);
    const [ownedPlan] = await db
      .select({ data: readingPlansTable.data })
      .from(readingPlansTable)
      .where(and(eq(readingPlansTable.id, planId), eq(readingPlansTable.userId, userId)))
      .limit(1);
    if (!ownedPlan) {
      res.json({ success: true });
      return;
    }
    const planData =
      ownedPlan.data &&
      typeof ownedPlan.data === "object" &&
      !Array.isArray(ownedPlan.data)
        ? (ownedPlan.data as Record<string, any>)
        : {};

    let normalizedEarnedDay =
      typeof earnedDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(earnedDay)
        ? earnedDay
        : null;
    if (normalizedEarnedDay) {
      const belongsToEarnedDay = Array.isArray(planData.assignments) && planData.assignments.some(
        (assignment: { date?: string; readings?: Array<{ key?: string }> }) =>
          assignment.date === normalizedEarnedDay &&
          assignment.readings?.some((reading: { key?: string }) => reading.key === key),
      );
      if (!belongsToEarnedDay) normalizedEarnedDay = null;
    }
    const normalizedCompletionDate =
      typeof completionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(completionDate)
        ? completionDate
        : value && normalizedEarnedDay
          ? new Date().toISOString().slice(0, 10)
          : null;

    const completedMap =
      planData.completed &&
      typeof planData.completed === "object" &&
      !Array.isArray(planData.completed)
        ? planData.completed
        : {};
    const nextPlanData: Record<string, any> = {
      ...planData,
      completed: { ...completedMap, [key]: value },
    };
    if (normalizedEarnedDay) {
      if (value && normalizedCompletionDate) {
        const earnedDayKeys = Array.isArray(planData.earnedDayKeys)
          ? planData.earnedDayKeys.filter((date: unknown): date is string => typeof date === "string")
          : [];
        const dayCompletionDates =
          planData.dayCompletionDates &&
          typeof planData.dayCompletionDates === "object" &&
          !Array.isArray(planData.dayCompletionDates)
            ? planData.dayCompletionDates
            : {};
        nextPlanData.earnedDayKeys = [
          ...new Set([...earnedDayKeys, normalizedEarnedDay]),
        ];
        nextPlanData.dayCompletionDates = {
          ...dayCompletionDates,
          [normalizedEarnedDay]: normalizedCompletionDate,
        };
      }
    }
    await db
      .update(readingPlansTable)
      .set({ data: nextPlanData, updatedAt: new Date() })
      .where(and(eq(readingPlansTable.id, planId), eq(readingPlansTable.userId, userId)));

    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "POST /reading/complete failed");
    res.status(500).json({ success: false, error: err?.message || "Failed" });
  }
});

// POST /api/reading/day-complete — complete or reopen every reading in one assignment
router.post("/reading/day-complete", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { planId, date, completed, completionDate } = req.body;
    if (!planId || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ success: false, error: "Missing planId or valid date" });
      return;
    }

    const [ownedPlan] = await db
      .select({ data: readingPlansTable.data })
      .from(readingPlansTable)
      .where(and(eq(readingPlansTable.id, planId), eq(readingPlansTable.userId, userId)))
      .limit(1);
    const planData = ownedPlan?.data as {
      assignments?: Array<{ date?: string; readings?: Array<{ key?: string }> }>;
    } | undefined;
    const assignment = planData?.assignments?.find((item) => item.date === date);
    const keys = assignment?.readings
      ?.map((reading) => reading.key)
      .filter((key): key is string => typeof key === "string" && key.length > 0) || [];
    if (!ownedPlan || !assignment || keys.length === 0) {
      res.status(404).json({ success: false, error: "Reading day not found" });
      return;
    }

    const value = Boolean(completed);
    const normalizedCompletionDate =
      typeof completionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(completionDate)
        ? completionDate
        : new Date().toISOString().slice(0, 10);
    const storedData =
      ownedPlan.data &&
      typeof ownedPlan.data === "object" &&
      !Array.isArray(ownedPlan.data)
        ? (ownedPlan.data as Record<string, any>)
        : {};
    const completedMap =
      storedData.completed &&
      typeof storedData.completed === "object" &&
      !Array.isArray(storedData.completed)
        ? storedData.completed
        : {};
    const nextPlanData: Record<string, any> = {
      ...storedData,
      completed: Object.fromEntries(keys.map((key) => [key, value])),
    };
    nextPlanData.completed = { ...completedMap, ...nextPlanData.completed };
    if (value) {
      const earnedDayKeys = Array.isArray(storedData.earnedDayKeys)
        ? storedData.earnedDayKeys.filter((day: unknown): day is string => typeof day === "string")
        : [];
      const dayCompletionDates =
        storedData.dayCompletionDates &&
        typeof storedData.dayCompletionDates === "object" &&
        !Array.isArray(storedData.dayCompletionDates)
          ? storedData.dayCompletionDates
          : {};
      nextPlanData.earnedDayKeys = [...new Set([...earnedDayKeys, date])];
      nextPlanData.dayCompletionDates = {
        ...dayCompletionDates,
        [date]: normalizedCompletionDate,
      };
    }

    await db
      .update(readingPlansTable)
      .set({ data: nextPlanData, updatedAt: new Date() })
      .where(and(eq(readingPlansTable.id, planId), eq(readingPlansTable.userId, userId)));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "POST /reading/day-complete failed");
    res.status(500).json({ success: false, error: err?.message || "Failed" });
  }
});

export default router;
