export const runtime = "nodejs";

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.discipleos_POSTGRES_URL!);

export async function GET() {
  try {
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
      date:
        typeof row.date === "string"
          ? row.date
          : new Date(row.date).toISOString().slice(0, 10),
      time: row.time,
      notes: row.notes ?? "",
      remind: Boolean(row.remind),
      reminderMinutes: Number(row.reminder_minutes ?? 10),
      repeat: row.repeat ?? "none",
      repeatWeekdays: Array.isArray(row.repeat_weekdays)
        ? row.repeat_weekdays
        : row.repeat_weekdays ?? [],
      repeatUntil: row.repeat_until
        ? typeof row.repeat_until === "string"
          ? row.repeat_until
          : new Date(row.repeat_until).toISOString().slice(0, 10)
        : "",
    }));

    return new Response(JSON.stringify({ success: true, events }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Load events error:", error);

    return new Response(JSON.stringify({ success: false, events: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const event = await req.json();

    if (
      !event ||
      typeof event.id !== "string" ||
      typeof event.title !== "string" ||
      typeof event.type !== "string" ||
      typeof event.date !== "string" ||
      typeof event.time !== "string"
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid event payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
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
        ${JSON.stringify(event.repeatWeekdays ?? [])}::jsonb,
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Save event error:", error);

    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (typeof id !== "string" || !id) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid event id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await sql`
      DELETE FROM events
      WHERE id = ${id}
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete event error:", error);

    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}