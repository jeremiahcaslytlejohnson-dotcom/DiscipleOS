import { Router } from "express";
import { db } from "@workspace/db";
import { eventCompletionsTable, eventsTable } from "@workspace/db";
import { UpsertEventBody, UpsertEventResponse } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { eventOccursOnDate } from "../services/mountainRhythm";

const router = Router();

function normalizeDate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value as string | number | Date).toISOString().slice(0, 10);
}

function normalizeWeekdays(value: unknown): number[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isRemovedEventType(type: string) {
  const normalized = type.trim().toLowerCase();
  return normalized === "birthday" || normalized === "birthdays";
}

function rowToEvent(row: typeof eventsTable.$inferSelect) {
  const type = row.type.trim().toLowerCase();
  const countsTowardRhythm =
    type === "prayer" ||
    type === "fast" ||
    type === "fasting" ||
    type === "church"
      ? true
      : Boolean(row.countsTowardRhythm);

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    date: normalizeDate(row.date),
    time: row.time ?? "",
    notes: row.notes ?? "",
    remind: Boolean(row.remind),
    reminderMinutes: Number(row.reminderMinutes ?? 10),
    repeat: row.repeat ?? "none",
    repeatWeekdays: normalizeWeekdays(row.repeatWeekdays),
    repeatUntil: row.repeatUntil ? normalizeDate(row.repeatUntil) : "",
    timeZone: row.timeZone ?? "America/New_York",
    countsTowardRhythm,
  };
}

// GET /api/events — returns only the current user's events
router.get("/events", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const rows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.userId, userId))
      .orderBy(eventsTable.date, eventsTable.time);
    res.json({
      success: true,
      events: rows.filter((row) => !isRemovedEventType(row.type)).map(rowToEvent),
    });
  } catch (err: any) {
    req.log.error({ err }, "GET /events failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to load events" });
  }
});

// POST /api/events — create, update, or replace an event (scoped to current user)
router.post("/events", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const parsed = UpsertEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid event payload" });
      return;
    }

    const event = parsed.data;
    if (isRemovedEventType(event.type)) {
      res.status(400).json({ success: false, error: "Birthday events are no longer supported" });
      return;
    }
    const id = event.id || crypto.randomUUID();
    const replacesEventId = event.replacesEventId || null;
    if (replacesEventId === id) {
      res.status(400).json({ success: false, error: "Replacement event must use a new ID" });
      return;
    }

    // If an ID was provided, check whether it already belongs to a different user
    if (event.id) {
      const [existing] = await db
        .select({ id: eventsTable.id, userId: eventsTable.userId })
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (existing && existing.userId !== userId) {
        res.status(409).json({ success: false, error: "Event ID already in use by another user" });
        return;
      }
    }

    const values = {
      id,
      userId,
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      notes: event.notes ?? "",
      remind: Boolean(event.remind),
      reminderMinutes: Number(event.reminderMinutes ?? 10),
      repeat: event.repeat ?? "none",
      repeatWeekdays: Array.isArray(event.repeatWeekdays) ? event.repeatWeekdays : [],
      repeatUntil: event.repeatUntil || null,
      timeZone: event.timeZone || "America/New_York",
      countsTowardRhythm:
        ["prayer", "fast", "fasting", "church"].includes(event.type.trim().toLowerCase())
          ? true
          : Boolean(event.countsTowardRhythm),
      updatedAt: new Date(),
    };

    const saved = await db.transaction(async (tx) => {
      // Calendar edits deliberately mint a new ID. Deleting the superseded,
      // user-owned row in this transaction keeps the visible edit as one event
      // while leaving its historical sent_reminders record tied to the old ID.
      if (replacesEventId) {
        const [replacedOwned] = await tx
          .select({ id: eventsTable.id })
          .from(eventsTable)
          .where(and(eq(eventsTable.id, replacesEventId), eq(eventsTable.userId, userId)))
          .limit(1);
        if (replacedOwned) {
          await tx.delete(eventCompletionsTable).where(
            eq(eventCompletionsTable.eventId, replacesEventId),
          );
          await tx.delete(eventsTable).where(
            and(eq(eventsTable.id, replacesEventId), eq(eventsTable.userId, userId)),
          );
        }
      }

      const [existingOwned] = await tx
        .select({ id: eventsTable.id })
        .from(eventsTable)
        .where(and(eq(eventsTable.id, id), eq(eventsTable.userId, userId)))
        .limit(1);

      if (existingOwned) {
        const [updated] = await tx
          .update(eventsTable)
          .set(values)
          .where(and(eq(eventsTable.id, id), eq(eventsTable.userId, userId)))
          .returning();
        return updated;
      }

      const [created] = await tx.insert(eventsTable).values(values).returning();
      return created;
    });

    // Mark session as established — server state is now authoritative for this session
    if (!req.session.sessionEstablished) {
      req.session.sessionEstablished = true;
    }

    res.json(UpsertEventResponse.parse({ success: true, event: rowToEvent(saved) }));
  } catch (err: any) {
    req.log.error({ err }, "POST /events failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to save event" });
  }
});

// DELETE /api/events — only deletes the current user's event
router.delete("/events", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ success: false, error: "Missing id" });
      return;
    }
    const [ownedEvent] = await db
      .select({ id: eventsTable.id })
      .from(eventsTable)
      .where(and(eq(eventsTable.id, id), eq(eventsTable.userId, userId)))
      .limit(1);
    if (!ownedEvent) {
      res.json({ success: true });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.delete(eventCompletionsTable).where(eq(eventCompletionsTable.eventId, id));
      await tx.delete(eventsTable).where(and(eq(eventsTable.id, id), eq(eventsTable.userId, userId)));
    });
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "DELETE /events failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to delete event" });
  }
});

// POST /api/events/complete — mark one local calendar occurrence complete
router.post("/events/complete", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { eventId, occurrenceDate, completed } = req.body ?? {};
    if (
      typeof eventId !== "string" ||
      typeof occurrenceDate !== "string" ||
      typeof completed !== "boolean" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)
    ) {
      res.status(400).json({ success: false, error: "Invalid event completion payload" });
      return;
    }

    const [event] = await db
      .select()
      .from(eventsTable)
      .where(and(eq(eventsTable.id, eventId), eq(eventsTable.userId, userId)))
      .limit(1);
    if (!event) {
      res.status(409).json({ success: false, error: "Event is not owned by this session" });
      return;
    }

    const type = event.type.trim().toLowerCase();
    if (isRemovedEventType(type)) {
      res.status(400).json({ success: false, error: "Birthday events are no longer supported" });
      return;
    }
    if (
      !eventOccursOnDate(
        {
          ...event,
          repeatWeekdays: normalizeWeekdays(event.repeatWeekdays),
        },
        occurrenceDate,
      )
    ) {
      res.status(400).json({ success: false, error: "Occurrence does not belong to this event" });
      return;
    }

    const value = completed;
    await db
      .insert(eventCompletionsTable)
      .values({
        eventId,
        occurrenceDate,
        completed: value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [eventCompletionsTable.eventId, eventCompletionsTable.occurrenceDate],
        set: { completed: value, updatedAt: new Date() },
      });

    res.json({ success: true, eventId, occurrenceDate, completed: value });
  } catch (err: any) {
    req.log.error({ err }, "POST /events/complete failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to save event completion" });
  }
});

export default router;
