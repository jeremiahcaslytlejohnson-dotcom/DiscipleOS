import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

function rowToEvent(row: typeof eventsTable.$inferSelect) {
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
  };
}

// GET /api/events
router.get("/events", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(eventsTable)
      .orderBy(eventsTable.date, eventsTable.time);
    res.json({ success: true, events: rows.map(rowToEvent) });
  } catch (err: any) {
    req.log.error({ err }, "GET /events failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to load events" });
  }
});

// POST /api/events — create or update
router.post("/events", async (req, res) => {
  try {
    const event = req.body;

    if (
      !event ||
      typeof event.title !== "string" ||
      typeof event.type !== "string" ||
      typeof event.date !== "string" ||
      typeof event.time !== "string"
    ) {
      res.status(400).json({ success: false, error: "Invalid event payload" });
      return;
    }

    const id = event.id || crypto.randomUUID();

    const values = {
      id,
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
      updatedAt: new Date(),
    };

    const [saved] = await db
      .insert(eventsTable)
      .values(values)
      .onConflictDoUpdate({ target: eventsTable.id, set: values })
      .returning();

    res.json({ success: true, event: rowToEvent(saved) });
  } catch (err: any) {
    req.log.error({ err }, "POST /events failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to save event" });
  }
});

// DELETE /api/events
router.delete("/events", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ success: false, error: "Missing id" });
      return;
    }
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "DELETE /events failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to delete event" });
  }
});

export default router;
