export const runtime = "nodejs";

import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  return (
    process.env.DISCIPLEOS_POSTGRES_URL ||
    process.env.discipleos_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ""
  );
}

function getSql() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "Missing database URL. Set DISCIPLEOS_POSTGRES_URL, discipleos_POSTGRES_URL, POSTGRES_URL, or DATABASE_URL."
    );
  }

  return neon(databaseUrl);
}

function normalizeDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return new Date(value as string | number | Date).toISOString().slice(0, 10);
}

function normalizeWeekdays(value: unknown) {
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

export async function GET() {
  try {
    const sql = getSql();

    const rows = await sql`
      SELECT
        id,
        title,
        type,
        date,
        time,
        notes,
        remind,
        reminder_minutes,
        repeat,
        repeat_weekdays,
        repeat_until
      FROM events
      ORDER BY date ASC, time ASC
    `;

    const events = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      date: normalizeDate(row.date),
      time: row.time ?? "",
      notes: row.notes ?? "",
      remind: Boolean(row.remind),
      reminderMinutes: Number(row.reminder_minutes ?? 10),
      repeat: row.repeat ?? "none",
      repeatWeekdays: normalizeWeekdays(row.repeat_weekdays),
      repeatUntil: row.repeat_until ? normalizeDate(row.repeat_until) : "",
    }));

    return Response.json({ success: true, events }, { status: 200 });
  } catch (error: any) {
    console.error("Load events error:", error);

    return Response.json(
      {
        success: false,
        events: [],
        error: error?.message || "Failed to load events",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sql = getSql();
    const event = await req.json();

    if (
      !event ||
      typeof event.id !== "string" ||
      typeof event.title !== "string" ||
      typeof event.type !== "string" ||
      typeof event.date !== "string" ||
      typeof event.time !== "string"
    ) {
      return Response.json(
        { success: false, error: "Invalid event payload" },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO events (
        id,
        title,
        type,
        date,
        time,
        notes,
        remind,
        reminder_minutes,
        repeat,
        repeat_weekdays,
        repeat_until
      )
      VALUES (
        ${event.id},
        ${event.title},
        ${event.type},
        ${event.date},
        ${event.time},
        ${event.notes ?? ""},
        ${Boolean(event.remind)},
        ${Number(event.reminderMinutes ?? 10)},
        ${event.repeat ?? "none"},
        ${JSON.stringify(Array.isArray(event.repeatWeekdays) ? event.repeatWeekdays : [])}::jsonb,
        ${event.repeatUntil || null}
      )
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        type = EXCLUDED.type,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        notes = EXCLUDED.notes,
        remind = EXCLUDED.remind,
        reminder_minutes = EXCLUDED.reminder_minutes,
        repeat = EXCLUDED.repeat,
        repeat_weekdays = EXCLUDED.repeat_weekdays,
        repeat_until = EXCLUDED.repeat_until,
        updated_at = NOW()
    `;

    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Save event error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to save event",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const sql = getSql();
    const { id } = await req.json();

    if (typeof id !== "string" || !id) {
      return Response.json(
        { success: false, error: "Invalid event id" },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM events
      WHERE id = ${id}
    `;

    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Delete event error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to delete event",
      },
      { status: 500 }
    );
  }
}